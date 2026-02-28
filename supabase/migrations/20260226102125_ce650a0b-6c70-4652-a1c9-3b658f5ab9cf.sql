
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url text;

-- Create clinic_assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic_assets', 'clinic_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read clinic assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic_assets');
