CREATE POLICY "Signed-in users can view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload to their own avatar folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);