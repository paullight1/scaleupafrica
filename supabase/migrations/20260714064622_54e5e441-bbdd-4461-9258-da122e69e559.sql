
CREATE POLICY "Public read profile media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'profile-media');
CREATE POLICY "Users upload own profile media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own profile media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own profile media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
