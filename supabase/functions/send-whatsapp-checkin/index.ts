import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId } = await req.json();

    if (!elderId) {
      throw new Error('elderId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get elder details
    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .select('id, full_name, preferred_language, whatsapp_number, phone_number, medical_conditions')
      .eq('id', elderId)
      .single();

    if (elderError || !elder) {
      throw new Error('Elder not found');
    }

    const whatsappNumber = elder.whatsapp_number || elder.phone_number;
    if (!whatsappNumber) {
      throw new Error('No WhatsApp number configured for this elder');
    }

    // Get medicines
    const { data: medicines } = await supabase
      .from('medicines')
      .select('name, dosage, timing')
      .eq('elder_id', elderId)
      .eq('active', true);

    // Get previous check-ins for context
    const { data: previousCheckIns } = await supabase
      .from('check_ins')
      .select('symptoms_reported, well_being_score, created_at')
      .eq('elder_id', elderId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build greeting message based on language
    const isHindi = elder.preferred_language === 'hindi';
    const medicineList = medicines?.map(m => m.name).join(', ') || 'your medicines';
    
    let greetingMessage: string;
    if (isHindi) {
      greetingMessage = `🙏 नमस्ते ${elder.full_name}!\n\nमैं आपका स्वास्थ्य सहायक हूं। आज आप कैसा महसूस कर रहे हैं?\n\nक्या आपने आज अपनी दवाइयां ली हैं? (${medicineList})`;
    } else {
      greetingMessage = `👋 Hello ${elder.full_name}!\n\nThis is your daily health check-in. How are you feeling today?\n\nHave you taken your medicines? (${medicineList})`;
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({ elder_id: elderId, status: 'active' })
      .select('id')
      .single();

    if (convError) {
      throw convError;
    }

    // Save greeting as first message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: greetingMessage,
    });

    // Send via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioWhatsAppNumber}`,
          To: `whatsapp:${whatsappNumber}`,
          Body: greetingMessage,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio error:', error);
      throw new Error(`Failed to send WhatsApp message: ${error}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('WhatsApp check-in sent:', twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: conversation.id,
        messageSid: twilioData.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending WhatsApp check-in:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
