
-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Staff (PIN login)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','kasir','dapur')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  queue_no INT NOT NULL,
  cashier_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  cashier_name TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  order_status TEXT NOT NULL DEFAULT 'menunggu' CHECK (order_status IN ('menunggu','diproses','selesai','diambil','dibatalkan')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transaction items
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  qty INT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  note TEXT
);
GRANT ALL ON public.transaction_items TO service_role;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_txn_created ON public.transactions(created_at DESC);
CREATE INDEX idx_txn_items_txn ON public.transaction_items(transaction_id);

-- Seed categories
INSERT INTO public.categories (name, sort_order) VALUES
  ('Kopi', 1),
  ('Minuman', 2),
  ('Makanan', 3),
  ('Snack', 4);

-- Seed products
WITH c AS (SELECT id, name FROM public.categories)
INSERT INTO public.products (category_id, name, price, stock)
SELECT c.id, p.name, p.price, 100 FROM c
JOIN (VALUES
  ('Kopi', 'Kopi Hitam', 8000),
  ('Kopi', 'Kopi Susu', 12000),
  ('Kopi', 'Es Kopi Gula Aren', 15000),
  ('Kopi', 'Cappuccino', 18000),
  ('Minuman', 'Es Teh', 5000),
  ('Minuman', 'Teh Hangat', 4000),
  ('Minuman', 'Air Mineral', 4000),
  ('Minuman', 'Es Cokelat', 12000),
  ('Makanan', 'Nasi Goreng', 18000),
  ('Makanan', 'Mie Goreng', 15000),
  ('Makanan', 'Kentang Goreng', 12000),
  ('Makanan', 'Roti Bakar', 10000),
  ('Snack', 'Pisang Goreng', 8000),
  ('Snack', 'Cireng', 8000),
  ('Snack', 'Keripik', 5000)
) p(cat, name, price) ON c.name = p.cat;

-- Seed staff (PIN demo)
INSERT INTO public.staff (name, pin, role) VALUES
  ('Administrator', '1234', 'admin'),
  ('Kasir 1', '2222', 'kasir'),
  ('Dapur', '3333', 'dapur');
