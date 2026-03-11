-- ============================================
-- STORAGE BUCKETS FOR MAI TALENT
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- AVATARS BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- SHOWS BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shows', 'shows', true, 524288000, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access shows" ON storage.objects FOR SELECT USING (bucket_id = 'shows');
CREATE POLICY "Users upload shows" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shows' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users update shows" ON storage.objects FOR UPDATE USING (bucket_id = 'shows' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users delete shows" ON storage.objects FOR DELETE USING (bucket_id = 'shows' AND auth.uid() IS NOT NULL);

-- ============================================
-- AUDITIONS BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('auditions', 'auditions', true, 209715200, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access auditions" ON storage.objects FOR SELECT USING (bucket_id = 'auditions');
CREATE POLICY "Users upload auditions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'auditions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update auditions" ON storage.objects FOR UPDATE USING (bucket_id = 'auditions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete auditions" ON storage.objects FOR DELETE USING (bucket_id = 'auditions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- GIFTS BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gifts', 'gifts', true, 10485760, ARRAY['image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access gifts" ON storage.objects FOR SELECT USING (bucket_id = 'gifts');
CREATE POLICY "Admins upload gifts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gifts' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins update gifts" ON storage.objects FOR UPDATE USING (bucket_id = 'gifts' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins delete gifts" ON storage.objects FOR DELETE USING (bucket_id = 'gifts' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
