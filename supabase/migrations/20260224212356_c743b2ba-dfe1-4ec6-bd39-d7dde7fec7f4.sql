
-- Table to store editable subscription plans
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE, -- 'trial', 'monthly', 'annual'
  name text NOT NULL,
  price text NOT NULL, -- formatted e.g. 'R$ 29,90'
  period text NOT NULL, -- e.g. '/mês', '1 hora'
  features text[] NOT NULL DEFAULT '{}',
  payment_link text DEFAULT '',
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans (they are shown on public-facing pages)
CREATE POLICY "Anyone can view plans" ON public.subscription_plans
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default plans
INSERT INTO public.subscription_plans (slug, name, price, period, features, payment_link, is_popular, sort_order) VALUES
  ('trial', 'Teste Grátis', 'R$ 0', '1 hora', ARRAY['Acesso total ao catálogo por 1 hora','1 tela simultânea','Qualidade HD','Sem compromisso'], '', false, 0),
  ('monthly', 'Mensal', 'R$ 29,90', '/mês', ARRAY['Acesso total ao catálogo','Até 2 telas simultâneas','Qualidade HD','Canais ao vivo','Cancele quando quiser'], '', false, 1),
  ('annual', 'Anual', 'R$ 19,90', '/mês', ARRAY['Tudo do plano mensal','Até 4 telas simultâneas','Qualidade 4K','Download offline','Economia de 33%','Suporte prioritário'], '', true, 2);
