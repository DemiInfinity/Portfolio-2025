-- Supabase Storage for portfolio images (admin uploads via API).
-- Prefer: Dashboard → Storage → New bucket → name: portfolio-media → Public bucket ON.

-- Or create / ensure the bucket via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-media', 'portfolio-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Optional: allow read via Storage API when using the anon key (public URLs work regardless).
DROP POLICY IF EXISTS "Public read portfolio-media" ON storage.objects;
CREATE POLICY "Public read portfolio-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-media');

-- Uploads use your backend with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- If the bucket is public, objects are also readable at:
--   https://<project-ref>.supabase.co/storage/v1/object/public/portfolio-media/<path>
