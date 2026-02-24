
-- Table to log all payment webhook events (transactions/sales)
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  event TEXT NOT NULL,
  plan TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment_transactions"
ON public.payment_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow the service role (webhook) to insert
CREATE POLICY "Service can insert transactions"
ON public.payment_transactions FOR INSERT
WITH CHECK (true);
