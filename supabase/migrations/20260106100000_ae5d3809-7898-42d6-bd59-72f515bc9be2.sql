-- Add recording URL to check_ins table
ALTER TABLE check_ins ADD COLUMN recording_url TEXT;

-- Add legal consent tracking to profiles
ALTER TABLE profiles ADD COLUMN terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN privacy_accepted_at TIMESTAMPTZ;