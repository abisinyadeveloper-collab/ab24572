DROP POLICY IF EXISTS "Signed-in users can view avatars" ON storage.objects;
CREATE POLICY "Owners can view their avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid()::text));