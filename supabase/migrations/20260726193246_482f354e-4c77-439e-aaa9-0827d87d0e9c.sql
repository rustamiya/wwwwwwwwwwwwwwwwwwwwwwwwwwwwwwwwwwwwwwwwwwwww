CREATE POLICY "Anyone can read covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Admins can upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'));