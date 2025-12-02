-- Drop existing check constraint
ALTER TABLE public.check_ins DROP CONSTRAINT check_ins_check_in_type_check;

-- Add updated constraint with 'simulation' included
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_check_in_type_check 
CHECK (check_in_type = ANY (ARRAY['voice'::text, 'whatsapp'::text, 'simulation'::text]));