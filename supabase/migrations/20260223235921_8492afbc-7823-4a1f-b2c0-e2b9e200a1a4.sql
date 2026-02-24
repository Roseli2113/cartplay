
-- Create storage bucket for content thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Allow authenticated users to view thumbnails
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Allow admins to upload thumbnails
CREATE POLICY "Admins can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update thumbnails
CREATE POLICY "Admins can update thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete thumbnails
CREATE POLICY "Admins can delete thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));
