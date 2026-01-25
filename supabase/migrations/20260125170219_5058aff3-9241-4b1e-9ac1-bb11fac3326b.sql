-- Create storage bucket for demo audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-audio', 'demo-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to demo audio
CREATE POLICY "Public can read demo audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'demo-audio');