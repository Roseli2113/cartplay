
-- Favorites table for users to save content
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id TEXT NOT NULL,
  content_table TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  stream_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicates
ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_content_unique UNIQUE (user_id, content_id, content_table);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);
