
-- Table for admin-configurable dashboard banner/trailer
CREATE TABLE public.dashboard_banner (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  trailer_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_banner ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active banners
CREATE POLICY "Authenticated can view banners"
ON public.dashboard_banner FOR SELECT
USING (true);

-- Only admins can manage banners
CREATE POLICY "Admins can insert banners"
ON public.dashboard_banner FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banners"
ON public.dashboard_banner FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banners"
ON public.dashboard_banner FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_banner_updated_at
BEFORE UPDATE ON public.dashboard_banner
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
