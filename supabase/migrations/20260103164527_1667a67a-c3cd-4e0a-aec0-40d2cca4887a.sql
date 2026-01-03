-- Add preferred language column to elders table
ALTER TABLE public.elders 
ADD COLUMN preferred_language text NOT NULL DEFAULT 'english';