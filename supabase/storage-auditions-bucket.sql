-- Create storage bucket for audition videos
-- Run this in your Supabase SQL Editor

-- Create the auditions bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auditions',
  'auditions',
  true,
  104857600, -- 100MB in bytes
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the auditions bucket
-- Allow authenticated users to upload audition videos
CREATE POLICY "Allow authenticated users to upload auditions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auditions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view audition videos (for judges/ceo to review)
CREATE POLICY "Allow anyone to view auditions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'auditions');

-- Allow users to delete their own audition videos
CREATE POLICY "Allow users to delete their own auditions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'auditions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
