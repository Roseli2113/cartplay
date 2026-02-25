
-- Fix default values on subscriptions table to match the trigger logic
ALTER TABLE public.subscriptions ALTER COLUMN plan SET DEFAULT 'none';
ALTER TABLE public.subscriptions ALTER COLUMN status SET DEFAULT 'inactive';
