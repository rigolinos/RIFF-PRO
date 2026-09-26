-- ============================================
-- STORAGE BUCKET: Avatars
-- ============================================

-- 1. Create a new public Storage Bucket called 'avatars'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for the bucket
-- Allow public read access
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatar." 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE 
USING (auth.uid() = owner);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar." 
ON storage.objects FOR DELETE 
USING (auth.uid() = owner);
