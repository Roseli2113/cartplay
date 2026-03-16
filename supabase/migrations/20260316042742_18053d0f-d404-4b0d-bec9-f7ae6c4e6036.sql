
-- Table for restricted content
CREATE TABLE public.restricted_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  stream_url text NOT NULL DEFAULT '',
  thumbnail_url text DEFAULT '',
  category text DEFAULT 'Restrito',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restricted_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage restricted_content" ON public.restricted_content FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view restricted_content" ON public.restricted_content FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_restricted_content_updated_at BEFORE UPDATE ON public.restricted_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for restricted area settings (password)
CREATE TABLE public.restricted_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL DEFAULT '1234',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restricted_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage restricted_settings" ON public.restricted_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view restricted_settings" ON public.restricted_settings FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_restricted_settings_updated_at BEFORE UPDATE ON public.restricted_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings row
INSERT INTO public.restricted_settings (password) VALUES ('1234');
