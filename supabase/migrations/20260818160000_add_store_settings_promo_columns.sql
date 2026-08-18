-- ========================================================
-- MIGRATION: Add Logo & Promo Banner Columns to store_settings
-- ========================================================

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_1 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_2 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_image_3 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_1 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_2 TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_title_3 TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
