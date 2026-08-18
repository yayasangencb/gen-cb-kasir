-- ========================================================
-- MIGRATION: Multi-Tenant Outlet & Super Admin System
-- ========================================================

-- 1. Create Outlets Table
CREATE TABLE IF NOT EXISTS public.outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.outlets TO service_role;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

-- 2. Alter Staff Table
ALTER TABLE public.staff ALTER COLUMN pin DROP NOT NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check CHECK (role IN ('super_admin', 'admin', 'kasir'));

-- 3. Add outlet_id to tables
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE RESTRICT;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_1 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_2 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_3 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_1 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_2 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_3 TEXT;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_staff_outlet ON public.staff(outlet_id);
CREATE INDEX IF NOT EXISTS idx_products_outlet ON public.products(outlet_id);
CREATE INDEX IF NOT EXISTS idx_categories_outlet ON public.categories(outlet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet ON public.transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_queues_outlet ON public.queues(outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_outlet ON public.stock_movements(outlet_id);

-- 5. Seed Outlets (ON CONFLICT (code) DO UPDATE)
INSERT INTO public.outlets (id, name, code, address, phone)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Kopi Kenangan', 'KENANGAN', 'Jl. Sudirman No. 12', '081234567890'),
  ('a0000000-0000-0000-0000-000000000002', 'Kopi Starbucks', 'STARBUCKS', 'Jl. Thamrin No. 45', '089876543210')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name, 
  address = EXCLUDED.address, 
  phone = EXCLUDED.phone;

-- 6. Seed Super Admin (ON CONFLICT (email))
INSERT INTO public.staff (name, email, password_hash, role, pin, outlet_id)
VALUES 
  ('Super Admin', 'yayasangencb@gmail.com', 'Generasicerdasberaksi_', 'super_admin', NULL, NULL)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Staff Outlet 1: Kopi Kenangan (ON CONFLICT (pin))
-- Admin Kasir (1234), Kasir (2222)
INSERT INTO public.staff (name, pin, role, outlet_id)
VALUES 
  ('Admin Kenangan', '1234', 'admin', 'a0000000-0000-0000-0000-000000000001'),
  ('Kasir Kenangan', '2222', 'kasir', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (pin) DO UPDATE SET 
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Staff Outlet 2: Kopi Starbucks (ON CONFLICT (pin))
-- Admin Kasir (1111), Kasir (3333)
INSERT INTO public.staff (name, pin, role, outlet_id)
VALUES 
  ('Admin Starbucks', '1111', 'admin', 'a0000000-0000-0000-0000-000000000002'),
  ('Kasir Starbucks', '3333', 'kasir', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (pin) DO UPDATE SET 
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Attach existing NULL outlet products and categories to Outlet 1 (Kopi Kenangan)
UPDATE public.categories SET outlet_id = 'a0000000-0000-0000-0000-000000000001' WHERE outlet_id IS NULL;
UPDATE public.products SET outlet_id = 'a0000000-0000-0000-0000-000000000001' WHERE outlet_id IS NULL;
UPDATE public.transactions SET outlet_id = 'a0000000-0000-0000-0000-000000000001' WHERE outlet_id IS NULL;
UPDATE public.queues SET outlet_id = 'a0000000-0000-0000-0000-000000000001' WHERE outlet_id IS NULL;
UPDATE public.stock_movements SET outlet_id = 'a0000000-0000-0000-0000-000000000001' WHERE outlet_id IS NULL;

-- Clone Categories & Products for Outlet 2 (Starbucks) as template default
INSERT INTO public.categories (name, sort_order, outlet_id)
SELECT name, sort_order, 'a0000000-0000-0000-0000-000000000002' FROM public.categories WHERE outlet_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO public.products (category_id, name, selling_price, stock, outlet_id)
SELECT c2.id, p.name, p.selling_price, p.stock, 'a0000000-0000-0000-0000-000000000002'
FROM public.products p
JOIN public.categories c1 ON p.category_id = c1.id
JOIN public.categories c2 ON c1.name = c2.name AND c2.outlet_id = 'a0000000-0000-0000-0000-000000000002'
WHERE p.outlet_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- 7. RPC Function: Create POS Transaction per Outlet
CREATE OR REPLACE FUNCTION public.create_pos_transaction(
  _cashier_id uuid,
  _customer_name text,
  _order_type text,
  _discount numeric,
  _payment_method text,
  _amount_paid numeric,
  _notes text,
  _items jsonb,
  _outlet_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cashier_name text;
  v_effective_outlet uuid;
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

  SELECT name, outlet_id INTO v_cashier_name, v_effective_outlet 
  FROM staff WHERE id = _cashier_id AND is_active;
  
  IF v_cashier_name IS NULL THEN RAISE EXCEPTION 'Kasir tidak valid'; END IF;
  IF _outlet_id IS NOT NULL THEN v_effective_outlet := _outlet_id; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Jumlah pesanan tidak valid'; END IF;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF v_prod IS NULL THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    IF v_effective_outlet IS NOT NULL AND v_prod.outlet_id != v_effective_outlet THEN
      RAISE EXCEPTION 'Produk % bukan milik toko ini', v_prod.name;
    END IF;
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

  -- serialize queue numbering per day per outlet
  PERFORM pg_advisory_xact_lock(hashtext('gencb_queue_' || COALESCE(v_effective_outlet::text, 'global') || '_' || v_today::text));
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue 
  FROM queues 
  WHERE queue_date = v_today AND (outlet_id = v_effective_outlet OR (outlet_id IS NULL AND v_effective_outlet IS NULL));
  
  v_number := 'INV-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_queue::text, 4, '0');

  INSERT INTO transactions (
    transaction_number, cashier_id, cashier_name, customer_name, order_type,
    subtotal, discount, tax, grand_total, amount_paid, change_amount,
    payment_method, payment_status, transaction_status, notes, outlet_id
  ) VALUES (
    v_number, _cashier_id, v_cashier_name, NULLIF(trim(COALESCE(_customer_name,'')),''),
    COALESCE(_order_type,'dine_in'), v_subtotal, COALESCE(_discount,0), 0, v_grand,
    _amount_paid, v_change, _payment_method, 'paid', 'completed', NULLIF(trim(COALESCE(_notes,'')),''),
    v_effective_outlet
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
      reason, reference_id, created_by, created_by_name, outlet_id
    ) VALUES (
      v_prod.id, 'penjualan', v_prod.stock, -v_qty, v_prod.stock - v_qty,
      'Penjualan ' || v_number, v_txn_id, _cashier_id, v_cashier_name, v_effective_outlet
    );
  END LOOP;

  INSERT INTO queues (transaction_id, queue_number, queue_date, status, customer_name, outlet_id)
  VALUES (v_txn_id, v_queue, v_today, 'baru', NULLIF(trim(COALESCE(_customer_name,'')),''), v_effective_outlet);

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

-- 8. RPC Function: Clear Outlet Catalog (Clear All Feature)
CREATE OR REPLACE FUNCTION public.clear_outlet_catalog(_outlet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod_count integer;
  v_cat_count integer;
BEGIN
  IF _outlet_id IS NULL THEN
    RAISE EXCEPTION 'Outlet ID tidak boleh kosong';
  END IF;

  SELECT count(*) INTO v_prod_count FROM products WHERE outlet_id = _outlet_id;
  SELECT count(*) INTO v_cat_count FROM categories WHERE outlet_id = _outlet_id;

  DELETE FROM products WHERE outlet_id = _outlet_id;
  DELETE FROM categories WHERE outlet_id = _outlet_id;

  RETURN jsonb_build_object(
    'deleted_products', v_prod_count,
    'deleted_categories', v_cat_count
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.clear_outlet_catalog(uuid) TO service_role;
