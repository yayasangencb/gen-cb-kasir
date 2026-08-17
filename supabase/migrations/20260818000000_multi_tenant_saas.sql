-- ============================================================================
-- MIGRATION: 20260818000000_multi_tenant_saas.sql
-- DESCRIPTION: Multi-Tenant / Multi-UKM POS SaaS Architecture for GEN-CB Kasir
-- ============================================================================

-- 1. PACKAGES (Paket Berlangganan)
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  max_cashiers integer NOT NULL DEFAULT 1,
  max_customer_displays integer NOT NULL DEFAULT 1,
  max_queue_displays integer NOT NULL DEFAULT 1,
  max_products integer NOT NULL DEFAULT 100,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.packages (name, price, max_cashiers, max_customer_displays, max_queue_displays, max_products, features)
VALUES
  ('Starter', 99000, 1, 1, 1, 100, '["Dashboard Basic", "Kasir POS", "Struk Standard", "Queue Display"]'::jsonb),
  ('Business', 199000, 3, 2, 2, 999999, '["Dashboard Full", "Kasir Multi-User", "Customer Display Signage", "Queue Display", "Laporan Detail"]'::jsonb),
  ('Pro', 399000, 10, 5, 5, 999999, '["Full Features", "Multi Cashier & Display", "Advanced Analytics", "Payment Gateway Ready", "Priority Support"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 2. TENANTS (Usaha / UKM)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code text NOT NULL UNIQUE,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  city text,
  business_type text NOT NULL DEFAULT 'Coffee Shop',
  logo_url text,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  expired_at timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  max_cashiers integer NOT NULL DEFAULT 1,
  max_displays integer NOT NULL DEFAULT 2,
  notes text,
  primary_color text NOT NULL DEFAULT '#002B7F',
  accent_color text NOT NULL DEFAULT '#FF7A00',
  qris_image_url text,
  qris_provider text NOT NULL DEFAULT 'STATIC',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenants_code_idx ON public.tenants (tenant_code);
CREATE INDEX IF NOT EXISTS tenants_status_idx ON public.tenants (status, is_deleted);

-- 3. ACCESS PINS (PIN Hak Akses Tenant)
CREATE TABLE IF NOT EXISTS public.access_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('tenant_admin', 'cashier', 'customer_display', 'queue_display')),
  pin_raw text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_role_pin UNIQUE (tenant_id, role)
);
CREATE INDEX IF NOT EXISTS access_pins_lookup_idx ON public.access_pins (tenant_id, role, pin_raw);

-- 4. PIN LOGIN ATTEMPTS (Anti-Bruteforce Rate Limiter)
CREATE TABLE IF NOT EXISTS public.pin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_code_attempt UNIQUE (tenant_code)
);

-- 5. TENANT DEVICES (Manajemen Perangkat / Sesi)
CREATE TABLE IF NOT EXISTS public.tenant_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL,
  device_token text NOT NULL UNIQUE,
  device_name text,
  browser text,
  ip_address text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. PROMOTIONS (Promosi & Diskon)
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'nominal', 'fixed_price')),
  discount_value numeric NOT NULL DEFAULT 0,
  product_id uuid,
  category_id uuid,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  show_on_display boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. DISPLAY CONTENTS (Slideshow Customer Display Signage)
CREATE TABLE IF NOT EXISTS public.display_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('banner', 'product', 'promo', 'video', 'qris')),
  media_url text NOT NULL,
  title text,
  subtitle text,
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 8,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. PAYMENT INTEGRATIONS & PAYMENTS
CREATE TABLE IF NOT EXISTS public.payment_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  merchant_id text,
  public_key text,
  secret_reference text,
  webhook_secret_reference text,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  payment_method text NOT NULL,
  provider text NOT NULL DEFAULT 'STATIC_QRIS',
  amount numeric NOT NULL,
  external_reference text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  qr_payload text,
  qr_image_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. AUDIT LOGS (Catatan Aktivitas Super Admin)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text NOT NULL,
  action text NOT NULL,
  tenant_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. ADD TENANT_ID TO OPERATIONAL TABLES
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products (tenant_id);
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON public.categories (tenant_id);
CREATE INDEX IF NOT EXISTS transactions_tenant_idx ON public.transactions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS queues_tenant_idx ON public.queues (tenant_id, queue_date, status);
CREATE INDEX IF NOT EXISTS stock_movements_tenant_idx ON public.stock_movements (tenant_id, created_at DESC);

-- 11. ATOMIC MULTI-TENANT CHECKOUT & QUEUE FUNCTION
CREATE OR REPLACE FUNCTION public.create_pos_transaction_multi(
  _tenant_id uuid,
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
  v_tenant_code text;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant ID wajib ada'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Keranjang kosong'; END IF;

  SELECT tenant_code INTO v_tenant_code FROM tenants WHERE id = _tenant_id AND status = 'active' AND NOT is_deleted;
  IF v_tenant_code IS NULL THEN RAISE EXCEPTION 'Tenant tidak aktif atau tidak ditemukan'; END IF;

  SELECT name INTO v_cashier_name FROM staff WHERE id = _cashier_id AND is_active AND (tenant_id = _tenant_id OR tenant_id IS NULL);
  IF v_cashier_name IS NULL THEN v_cashier_name := 'Kasir'; END IF;

  -- validate & lock products for this specific tenant
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Jumlah pesanan tidak valid'; END IF;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid AND tenant_id = _tenant_id FOR UPDATE;
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

  -- serialize queue numbering per tenant per date
  PERFORM pg_advisory_xact_lock(hashtext('gencb_queue_' || _tenant_id::text || '_' || v_today::text));
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue FROM queues WHERE tenant_id = _tenant_id AND queue_date = v_today;
  v_number := v_tenant_code || '-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_queue::text, 4, '0');

  INSERT INTO transactions (
    tenant_id, transaction_number, cashier_id, cashier_name, customer_name, order_type,
    subtotal, discount, tax, grand_total, amount_paid, change_amount,
    payment_method, payment_status, transaction_status, notes
  ) VALUES (
    _tenant_id, v_number, _cashier_id, v_cashier_name, NULLIF(trim(COALESCE(_customer_name,'')),''),
    COALESCE(_order_type,'dine_in'), v_subtotal, COALESCE(_discount,0), 0, v_grand,
    _amount_paid, v_change, _payment_method, 'paid', 'completed', NULLIF(trim(COALESCE(_notes,'')),'')
  ) RETURNING id INTO v_txn_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid AND tenant_id = _tenant_id FOR UPDATE;

    INSERT INTO transaction_items (
      tenant_id, transaction_id, product_id, product_name_snapshot, product_price_snapshot,
      quantity, subtotal, notes
    ) VALUES (
      _tenant_id, v_txn_id, v_prod.id, v_prod.name, v_prod.selling_price, v_qty,
      v_prod.selling_price * v_qty, NULLIF(trim(COALESCE(v_item->>'notes','')),'')
    );

    UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_prod.id;

    INSERT INTO stock_movements (
      tenant_id, product_id, movement_type, quantity_before, quantity_change, quantity_after,
      reason, reference_id, created_by, created_by_name
    ) VALUES (
      _tenant_id, v_prod.id, 'penjualan', v_prod.stock, -v_qty, v_prod.stock - v_qty,
      'Penjualan ' || v_number, v_txn_id, _cashier_id, v_cashier_name
    );
  END LOOP;

  INSERT INTO queues (tenant_id, transaction_id, queue_number, queue_date, status, customer_name)
  VALUES (_tenant_id, v_txn_id, v_queue, v_today, 'baru', NULLIF(trim(COALESCE(_customer_name,'')),''));

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

GRANT EXECUTE ON FUNCTION public.create_pos_transaction_multi(uuid,uuid,text,text,numeric,text,numeric,text,jsonb) TO service_role, anon, authenticated;

-- 12. REALTIME PUBLICATION FOR MULTI-TENANT TABLES
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.display_contents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 13. STORAGE BUCKET FOR CUSTOMER DISPLAY
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-display', 'customer-display', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public customer-display read" ON storage.objects;
CREATE POLICY "Public customer-display read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'customer-display');
DROP POLICY IF EXISTS "Public customer-display upload" ON storage.objects;
CREATE POLICY "Public customer-display upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'customer-display');
