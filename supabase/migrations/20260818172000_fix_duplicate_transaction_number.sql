-- 1. Drop old global unique constraint on queues (queue_date, queue_number) which blocked multi-outlet queue numbers
DROP INDEX IF EXISTS public.queues_date_number_key;
ALTER TABLE public.queues DROP CONSTRAINT IF EXISTS queues_date_number_key;

-- 2. Create new per-outlet unique index for queues
CREATE UNIQUE INDEX IF NOT EXISTS queues_outlet_date_number_key 
ON public.queues (queue_date, queue_number, COALESCE(outlet_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Update create_pos_transaction SQL function with collision-proof queue & transaction number generation
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
  v_txn_seq integer;
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

  -- 1. Serialize queue numbering per day per outlet
  PERFORM pg_advisory_xact_lock(hashtext('gencb_queue_' || COALESCE(v_effective_outlet::text, 'global') || '_' || v_today::text));
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue 
  FROM queues 
  WHERE queue_date = v_today AND (outlet_id = v_effective_outlet OR (outlet_id IS NULL AND v_effective_outlet IS NULL));

  -- Loop safeguard: if (queue_date, queue_number, outlet_id) already exists, increment v_queue until unique
  WHILE EXISTS (
    SELECT 1 FROM queues 
    WHERE queue_date = v_today 
      AND queue_number = v_queue 
      AND (outlet_id = v_effective_outlet OR (outlet_id IS NULL AND v_effective_outlet IS NULL))
  ) LOOP
    v_queue := v_queue + 1;
  END LOOP;

  -- 2. Serialize transaction_number globally per day
  PERFORM pg_advisory_xact_lock(hashtext('gencb_txn_global_' || v_today::text));
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_txn_seq FROM transactions WHERE created_at >= v_today::timestamp;
  
  v_number := 'INV-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_txn_seq::text, 4, '0');

  -- Loop safeguard: if transaction_number already exists, increment v_txn_seq until 100% unique
  WHILE EXISTS (SELECT 1 FROM transactions WHERE transaction_number = v_number) LOOP
    v_txn_seq := v_txn_seq + 1;
    v_number := 'INV-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_txn_seq::text, 4, '0');
  END LOOP;

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
    'change_amount', v_change,
    'cashier_name', v_cashier_name,
    'created_at', now()
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
