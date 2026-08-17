-- ============================================================================
-- MULTI-TENANT POS & SAAS PLATFORM MIGRATION - GEN CB KASIR
-- ============================================================================

-- 1. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  max_cashiers integer NOT NULL DEFAULT 2,
  max_devices integer NOT NULL DEFAULT 2,
  max_products integer NOT NULL DEFAULT 100,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO public.plans (id, name, price, duration_days, max_cashiers, max_devices, max_products, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Basic Starter', 0, 365, 3, 3, 150, true),
  ('22222222-2222-2222-2222-222222222222', 'Pro Business', 150000, 30, 10, 10, 1000, true)
ON CONFLICT (id) DO NOTHING;

-- 2. TENANTS / UKM ACCOUNTS
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  owner_name text NOT NULL DEFAULT 'Pemilik Toko',
  owner_whatsapp text,
  owner_email text,
  address text,
  city text,
  province text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'trial')),
  valid_until timestamptz,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default tenant for existing data
INSERT INTO public.tenants (id, name, slug, owner_name, owner_email, status, valid_until)
VALUES ('00000000-0000-0000-0000-000000000001', 'Gen CB Cafe', 'gen-cb-cafe', 'Admin Gen CB', 'yayasangencb@gmail.com', 'active', now() + interval '10 years')
ON CONFLICT (id) DO NOTHING;

-- 3. TENANT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'expired', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. TENANT MEMBERS (Admin Kasir & Kasir)
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('tenant_admin', 'cashier')),
  pin_hash text NOT NULL,
  encrypted_pin text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default tenant admin & cashier if not exists
INSERT INTO public.tenant_members (id, tenant_id, name, role, pin_hash, encrypted_pin, is_active)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Manager Gen CB', 'tenant_admin', '1234', '1234', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Kasir Utama', 'cashier', '2222', '2222', true)
ON CONFLICT (id) DO NOTHING;

-- 5. DEVICES (Customer Display & Queue Display)
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_type text NOT NULL CHECK (device_type IN ('customer_display', 'queue_display')),
  name text NOT NULL,
  access_pin_hash text NOT NULL,
  encrypted_pin text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  last_login_at timestamptz,
  current_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default customer & queue display devices
INSERT INTO public.devices (id, tenant_id, device_type, name, access_pin_hash, encrypted_pin, is_active)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'customer_display', 'Display Depan Kasir', '348521', '348521', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'queue_display', 'Display Nomor Antrean', '9999', '9999', true)
ON CONFLICT (id) DO NOTHING;

-- 6. POS TERMINALS (Pairing Kasir -> Customer Display)
CREATE TABLE IF NOT EXISTS public.pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Terminal Kasir Utama',
  cashier_device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  customer_display_device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. DISPLAY PROMOTIONS (Slideshow for Customer Display)
CREATE TABLE IF NOT EXISTS public.display_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  promotion_type text NOT NULL DEFAULT 'banner' CHECK (promotion_type IN ('banner', 'product', 'discount', 'announcement')),
  product_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. PAYMENT ARCHITECTURE (Providers, Settings, Transactions)
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  supports_qris boolean NOT NULL DEFAULT true,
  supports_va boolean NOT NULL DEFAULT false,
  supports_ewallet boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_providers (provider_code, provider_name, supports_qris, supports_va, supports_ewallet)
VALUES 
  ('qris_statik', 'QRIS Statik / Manual', true, false, false),
  ('midtrans', 'Midtrans Gateway', true, true, true),
  ('xendit', 'Xendit Gateway', true, true, true),
  ('pakasir', 'Pakasir QRIS', true, false, false)
ON CONFLICT (provider_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.payment_providers(id) ON DELETE CASCADE,
  merchant_id text,
  configuration_encrypted text,
  qris_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_id)
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id uuid,
  provider_id uuid REFERENCES public.payment_providers(id) ON DELETE SET NULL,
  external_reference text,
  payment_method text NOT NULL DEFAULT 'qris',
  gross_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'cancelled', 'refunded')),
  qr_string text,
  qr_image_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. ACTIVITY LOGS (Platform Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('super_admin', 'tenant_admin', 'cashier', 'device', 'system')),
  actor_id text,
  actor_name text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ADD TENANT_ID TO OPERATIONAL TABLES & MIGRATE EXISTING DATA
-- ============================================================================

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.products SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.transactions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS announced_at timestamptz;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS last_recalled_at timestamptz;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS recall_count integer NOT NULL DEFAULT 0;
UPDATE public.queues SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.stock_movements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.store_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- ============================================================================
-- ATOMIC MULTI-TENANT CHECKOUT RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_pos_transaction_tenant(
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
  v_tenant_slug text;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant ID wajib diisi'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Keranjang kosong'; END IF;

  SELECT slug INTO v_tenant_slug FROM tenants WHERE id = _tenant_id AND status = 'active';
  IF v_tenant_slug IS NULL THEN RAISE EXCEPTION 'Tenant tidak aktif atau tidak ditemukan'; END IF;

  SELECT name INTO v_cashier_name FROM tenant_members WHERE id = _cashier_id AND tenant_id = _tenant_id AND is_active;
  IF v_cashier_name IS NULL THEN
    SELECT name INTO v_cashier_name FROM staff WHERE id = _cashier_id AND is_active;
  END IF;
  IF v_cashier_name IS NULL THEN v_cashier_name := 'Kasir'; END IF;

  -- Validate stock & compute prices from DB
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Jumlah pesanan tidak valid'; END IF;

    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid AND tenant_id = _tenant_id FOR UPDATE;
    IF v_prod IS NULL THEN RAISE EXCEPTION 'Produk tidak ditemukan dalam toko ini'; END IF;
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
    RAISE EXCEPTION 'Uang diterima kurang dari total tagihan';
  END IF;
  v_change := _amount_paid - v_grand;

  -- Per-tenant daily queue serialization
  PERFORM pg_advisory_xact_lock(hashtext('queue_' || _tenant_id::text || '_' || v_today::text));
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue FROM queues WHERE tenant_id = _tenant_id AND queue_date = v_today;
  v_number := 'INV-' || upper(replace(v_tenant_slug, '-', '')) || '-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_queue::text, 3, '0');

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
      transaction_id, product_id, product_name_snapshot, product_price_snapshot,
      quantity, subtotal, notes
    ) VALUES (
      v_txn_id, v_prod.id, v_prod.name, v_prod.selling_price, v_qty,
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

GRANT EXECUTE ON FUNCTION public.create_pos_transaction_tenant TO service_role, anon, authenticated;

-- Enable Realtime for queues
ALTER TABLE public.queues REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
