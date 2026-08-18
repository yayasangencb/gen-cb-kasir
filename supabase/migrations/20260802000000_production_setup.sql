-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policy for public access
DROP POLICY IF EXISTS "Public product-images read" ON storage.objects;
CREATE POLICY "Public product-images read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public product-images upload" ON storage.objects;
CREATE POLICY "Public product-images upload" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public product-images update" ON storage.objects;
CREATE POLICY "Public product-images update" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public product-images delete" ON storage.objects;
CREATE POLICY "Public product-images delete" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'product-images');

-- Ensure staff role check constraint only allows admin & kasir
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check CHECK (role IN ('admin', 'kasir'));
UPDATE public.staff SET is_active = false WHERE role NOT IN ('admin', 'kasir');

-- Ensure default store settings exist
INSERT INTO public.store_settings (
  store_name, receipt_footer, display_header, display_footer,
  queue_reset_mode, display_pin, sound_enabled, sound_volume,
  completed_display_duration, max_display_items, show_customer_name, show_clock, receipt_paper
)
SELECT
  'GEN-CB Kasir',
  'Terima kasih telah berbelanja. Silakan menunggu nomor antrean Anda.',
  'STATUS PESANAN',
  'Mohon menunggu hingga nomor antrean Anda berwarna hijau.',
  'harian', '9999', true, 1, 300, 10, true, true, '80mm'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);
