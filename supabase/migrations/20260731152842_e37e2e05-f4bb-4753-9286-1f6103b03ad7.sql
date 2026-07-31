-- ============ CATEGORIES ============
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============ PRODUCTS ============
ALTER TABLE public.products RENAME COLUMN price TO selling_price;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS minimum_stock integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- ============ STAFF (admin & kasir only) ============
UPDATE public.staff SET is_active = false WHERE role NOT IN ('admin','kasir');
DELETE FROM public.staff WHERE role NOT IN ('admin','kasir');
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check CHECK (role IN ('admin','kasir'));

-- ============ TRANSACTIONS ============
ALTER TABLE public.transactions RENAME COLUMN invoice_no TO transaction_number;
ALTER TABLE public.transactions RENAME COLUMN total TO grand_total;
ALTER TABLE public.transactions RENAME COLUMN paid TO amount_paid;
ALTER TABLE public.transactions RENAME COLUMN note TO notes;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS order_status;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS queue_no;
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS transaction_status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_number_key ON public.transactions (transaction_number);

-- ============ TRANSACTION ITEMS ============
ALTER TABLE public.transaction_items RENAME COLUMN product_name TO product_name_snapshot;
ALTER TABLE public.transaction_items RENAME COLUMN price TO product_price_snapshot;
ALTER TABLE public.transaction_items RENAME COLUMN qty TO quantity;
ALTER TABLE public.transaction_items RENAME COLUMN note TO notes;

-- ============ QUEUES ============
CREATE TABLE IF NOT EXISTS public.queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  queue_number integer NOT NULL,
  queue_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  status text NOT NULL DEFAULT 'baru' CHECK (status IN ('baru','diproses','selesai','diambil','dibatalkan')),
  customer_name text,
  started_at timestamptz,
  completed_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS queues_date_number_key ON public.queues (queue_date, queue_number);
CREATE INDEX IF NOT EXISTS queues_status_idx ON public.queues (queue_date, status);
GRANT SELECT ON public.queues TO anon, authenticated;
GRANT ALL ON public.queues TO service_role;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Display can read today queues" ON public.queues;
CREATE POLICY "Display can read today queues" ON public.queues
  FOR SELECT TO anon, authenticated
  USING (queue_date = (now() AT TIME ZONE 'Asia/Jakarta')::date);

-- ============ STOCK MOVEMENTS ============
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('masuk','penjualan','penyesuaian','rusak','pembatalan','retur','koreksi')),
  quantity_before integer NOT NULL,
  quantity_change integer NOT NULL,
  quantity_after integer NOT NULL,
  reason text,
  reference_id uuid,
  cost_price numeric,
  supplier text,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements (product_id, created_at DESC);
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ============ STORE SETTINGS ============
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'GEN-CB Kasir',
  logo_url text,
  address text,
  phone text,
  receipt_footer text NOT NULL DEFAULT 'Terima kasih telah berbelanja. Silakan menunggu nomor antrean Anda.',
  display_header text NOT NULL DEFAULT 'STATUS PESANAN',
  display_footer text NOT NULL DEFAULT 'Mohon menunggu hingga nomor antrean Anda berwarna hijau.',
  queue_reset_mode text NOT NULL DEFAULT 'harian' CHECK (queue_reset_mode IN ('harian','manual')),
  display_pin text NOT NULL DEFAULT '9999',
  sound_enabled boolean NOT NULL DEFAULT true,
  sound_volume numeric NOT NULL DEFAULT 1,
  completed_display_duration integer NOT NULL DEFAULT 300,
  max_display_items integer NOT NULL DEFAULT 8,
  show_customer_name boolean NOT NULL DEFAULT true,
  show_clock boolean NOT NULL DEFAULT true,
  receipt_paper text NOT NULL DEFAULT '80mm' CHECK (receipt_paper IN ('58mm','80mm')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.store_settings (store_name) SELECT 'GEN-CB Kasir'
  WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_queues_updated_at ON public.queues;
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON public.queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ATOMIC CHECKOUT ============
CREATE OR REPLACE FUNCTION public.create_pos_transaction(
  _cashier_id uuid,
  _customer_name text,
  _order_type text,
  _discount numeric,
  _payment_method text,
  _amount_paid numeric,
  _notes text,
  _items jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cashier_name text;
  v_item jsonb;
  v_prod record;
  v_qty integer;
  v_subtotal numeric := 0;
  v_grand numeric;
  v_change numeric;
  v_txn_id uuid;
  v_queue integer;
  v_today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_number text;
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang kosong';
  END IF;

  SELECT name INTO v_cashier_name FROM staff WHERE id = _cashier_id AND is_active;
  IF v_cashier_name IS NULL THEN RAISE EXCEPTION 'Kasir tidak valid'; END IF;

  -- validate & lock products, compute subtotal from DB prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Jumlah pesanan tidak valid'; END IF;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF v_prod IS NULL THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    IF NOT v_prod.is_active OR NOT v_prod.is_available THEN
      RAISE EXCEPTION 'Produk % tidak tersedia', v_prod.name;
    END IF;
    IF v_prod.stock < v_qty THEN
      RAISE EXCEPTION 'Stok % hanya tersisa %', v_prod.name, v_prod.stock;
    END IF;
    v_subtotal := v_subtotal + (v_prod.selling_price * v_qty);
  END LOOP;

  v_grand := GREATEST(0, v_subtotal - COALESCE(_discount, 0));
  IF COALESCE(_amount_paid, 0) < v_grand THEN
    RAISE EXCEPTION 'Uang diterima kurang dari total';
  END IF;
  v_change := _amount_paid - v_grand;

  -- serialize queue numbering per day
  PERFORM pg_advisory_xact_lock(hashtext('gencb_queue_' || v_today::text));
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue FROM queues WHERE queue_date = v_today;
  v_number := 'INV-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_queue::text, 4, '0');

  INSERT INTO transactions (
    transaction_number, cashier_id, cashier_name, customer_name, order_type,
    subtotal, discount, tax, grand_total, amount_paid, change_amount,
    payment_method, payment_status, transaction_status, notes
  ) VALUES (
    v_number, _cashier_id, v_cashier_name, NULLIF(trim(COALESCE(_customer_name,'')),''),
    COALESCE(_order_type,'dine_in'), v_subtotal, COALESCE(_discount,0), 0, v_grand,
    _amount_paid, v_change, _payment_method, 'paid', 'completed', NULLIF(trim(COALESCE(_notes,'')),'')
  ) RETURNING id INTO v_txn_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;

    INSERT INTO transaction_items (
      transaction_id, product_id, product_name_snapshot, product_price_snapshot,
      quantity, subtotal, notes
    ) VALUES (
      v_txn_id, v_prod.id, v_prod.name, v_prod.selling_price, v_qty,
      v_prod.selling_price * v_qty, NULLIF(trim(COALESCE(v_item->>'notes','')),'')
    );

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_prod.id;

    INSERT INTO stock_movements (
      product_id, movement_type, quantity_before, quantity_change, quantity_after,
      reason, reference_id, created_by, created_by_name
    ) VALUES (
      v_prod.id, 'penjualan', v_prod.stock, -v_qty, v_prod.stock - v_qty,
      'Penjualan ' || v_number, v_txn_id, _cashier_id, v_cashier_name
    );
  END LOOP;

  INSERT INTO queues (transaction_id, queue_number, queue_date, status, customer_name)
  VALUES (v_txn_id, v_queue, v_today, 'baru', NULLIF(trim(COALESCE(_customer_name,'')),''));

  RETURN jsonb_build_object(
    'transaction_id', v_txn_id,
    'transaction_number', v_number,
    'queue_number', v_queue,
    'subtotal', v_subtotal,
    'discount', COALESCE(_discount,0),
    'grand_total', v_grand,
    'amount_paid', _amount_paid,
    'change_amount', v_change
  );
END; $$;

REVOKE ALL ON FUNCTION public.create_pos_transaction(uuid,text,text,numeric,text,numeric,text,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pos_transaction(uuid,text,text,numeric,text,numeric,text,jsonb) TO service_role;

-- ============ STOCK ADJUSTMENT ============
CREATE OR REPLACE FUNCTION public.adjust_stock(
  _product_id uuid,
  _movement_type text,
  _quantity integer,
  _reason text,
  _staff_id uuid,
  _cost_price numeric DEFAULT NULL,
  _supplier text DEFAULT NULL,
  _absolute boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod record;
  v_staff_name text;
  v_change integer;
  v_after integer;
BEGIN
  SELECT name INTO v_staff_name FROM staff WHERE id = _staff_id AND is_active;
  IF v_staff_name IS NULL THEN RAISE EXCEPTION 'Pengguna tidak valid'; END IF;

  SELECT * INTO v_prod FROM products WHERE id = _product_id FOR UPDATE;
  IF v_prod IS NULL THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;

  IF _absolute THEN
    IF _quantity < 0 THEN RAISE EXCEPTION 'Stok fisik tidak boleh negatif'; END IF;
    v_after := _quantity;
    v_change := _quantity - v_prod.stock;
  ELSE
    v_change := _quantity;
    v_after := v_prod.stock + _quantity;
    IF v_after < 0 THEN RAISE EXCEPTION 'Stok tidak boleh menjadi minus'; END IF;
  END IF;

  UPDATE products
    SET stock = v_after,
        cost_price = COALESCE(_cost_price, cost_price),
        updated_at = now()
    WHERE id = _product_id;

  INSERT INTO stock_movements (
    product_id, movement_type, quantity_before, quantity_change, quantity_after,
    reason, cost_price, supplier, created_by, created_by_name
  ) VALUES (
    _product_id, _movement_type, v_prod.stock, v_change, v_after,
    NULLIF(trim(COALESCE(_reason,'')),''), _cost_price, NULLIF(trim(COALESCE(_supplier,'')),''),
    _staff_id, v_staff_name
  );

  RETURN jsonb_build_object('stock_before', v_prod.stock, 'stock_change', v_change, 'stock_after', v_after);
END; $$;

REVOKE ALL ON FUNCTION public.adjust_stock(uuid,text,integer,text,uuid,numeric,text,boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid,text,integer,text,uuid,numeric,text,boolean) TO service_role;

-- ============ REALTIME ============
ALTER TABLE public.queues REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;