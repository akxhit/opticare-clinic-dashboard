-- Create prescriptions storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own prescriptions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own prescriptions"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own prescriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read prescriptions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prescriptions');
