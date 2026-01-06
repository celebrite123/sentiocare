-- Add check-in method to elders table
ALTER TABLE public.elders ADD COLUMN IF NOT EXISTS check_in_method text NOT NULL DEFAULT 'voice';

-- Create whatsapp_conversations table to track ongoing conversations
CREATE TABLE public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id uuid NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  check_in_id uuid REFERENCES public.check_ins(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  twilio_sid text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_conversations
CREATE POLICY "Family members can view their elders WhatsApp conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (elder_id IN (
  SELECT elders.id FROM elders
  WHERE elders.family_member_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
));

-- RLS policies for whatsapp_messages
CREATE POLICY "Family members can view their elders WhatsApp messages"
ON public.whatsapp_messages
FOR SELECT
USING (conversation_id IN (
  SELECT id FROM whatsapp_conversations
  WHERE elder_id IN (
    SELECT elders.id FROM elders
    WHERE elders.family_member_id IN (
      SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
    )
  )
));

-- Add triggers for updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();