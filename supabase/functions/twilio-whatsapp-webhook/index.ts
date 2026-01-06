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
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log('Incoming WhatsApp message:', { from, body: body.substring(0, 50), messageSid });

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = from.replace('whatsapp:', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find elder by WhatsApp number
    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .select('id, full_name, preferred_language, medical_conditions, whatsapp_number')
      .or(`whatsapp_number.eq.${phoneNumber},phone_number.eq.${phoneNumber}`)
      .single();

    if (elderError || !elder) {
      console.log('Elder not found for number:', phoneNumber);
      // Return empty TwiML to acknowledge receipt
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }

    console.log('Found elder:', elder.full_name);

    // Get elder's medicines
    const { data: medicines } = await supabase
      .from('medicines')
      .select('name, dosage, frequency, timing')
      .eq('elder_id', elder.id)
      .eq('active', true);

    // Find or create active conversation
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('elder_id', elder.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({ elder_id: elder.id, status: 'active' })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }
      conversation = newConv;
    }

    // Save incoming message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: body,
      twilio_sid: messageSid,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get previous check-ins for context
    const { data: previousCheckIns } = await supabase
      .from('check_ins')
      .select('symptoms_reported, conversation_summary, well_being_score, created_at')
      .eq('elder_id', elder.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build context for AI
    const previousSymptoms = previousCheckIns
      ?.flatMap(c => c.symptoms_reported || [])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5) || [];

    const recentConcerns = previousCheckIns
      ?.filter(c => c.conversation_summary)
      .map(c => c.conversation_summary)
      .slice(0, 3) || [];

    // Call AI chat function
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        elderId: elder.id,
        elderName: elder.full_name,
        userMessage: body,
        conversationHistory: history?.map(h => ({ role: h.role, content: h.content })) || [],
        medicines: medicines || [],
        preferredLanguage: elder.preferred_language || 'english',
        medicalConditions: elder.medical_conditions || [],
        previousSymptoms,
        recentConcerns,
      }),
    });

    const aiData = await aiResponse.json();
    const responseText = aiData.response || "I'm sorry, I couldn't process that. Please try again.";

    // Save AI response
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: responseText,
    });

    // Handle emergency alerts
    if (aiData.isEmergency) {
      console.log('Emergency detected, creating alert');
      await supabase.from('alerts').insert({
        elder_id: elder.id,
        alert_type: 'emergency',
        severity: 'high',
        title: 'Emergency Detected via WhatsApp',
        description: `Emergency keywords detected in WhatsApp conversation: "${body.substring(0, 100)}"`,
        resolved: false,
      });
    }

    // Send response via Twilio
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
          To: from,
          Body: responseText,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio send error:', error);
    }

    // Return empty TwiML (we're sending via API, not reply)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
  }
});
