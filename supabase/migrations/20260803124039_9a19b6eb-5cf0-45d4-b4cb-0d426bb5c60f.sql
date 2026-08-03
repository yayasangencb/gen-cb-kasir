-- Realtime for queues & products
ALTER TABLE public.queues REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Remove all demo/sample operational data
DELETE FROM public.stock_movements;
DELETE FROM public.queues;
DELETE FROM public.transaction_items;
DELETE FROM public.transactions;
DELETE FROM public.products;
