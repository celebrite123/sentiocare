-- Create payment_methods table for storing Razorpay saved cards/tokens
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razorpay_token_id TEXT NOT NULL,
  card_last4 TEXT,
  card_network TEXT,
  card_type TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_history table for tracking all payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_order_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  is_auto_renewal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create renewal_reminders table for tracking sent reminders
CREATE TABLE public.renewal_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- '3_days', '1_day'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add subscription management columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on all new tables
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_methods
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for payment_history
CREATE POLICY "Users can view their own payment history"
ON public.payment_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment history"
ON public.payment_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for renewal_reminders (read-only for users, service role manages)
CREATE POLICY "Users can view their own reminders"
ON public.renewal_reminders FOR SELECT
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();