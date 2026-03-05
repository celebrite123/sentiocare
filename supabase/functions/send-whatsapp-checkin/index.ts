import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const bearerToken = authHeader.replace('Bearer ', '');
    const isServiceRole = bearerToken === supabaseServiceKey;

    // ============ DUAL-MODE AUTH ============
    // Service role = internal cron/scheduler call (trusted)
    // User JWT = UI-initiated call (needs ownership check)
    let userId: string | null = null;

    if (!isServiceRole) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    } else {
      console.log('Internal service-role call - bypassing user auth');
    }
    // ============ END DUAL-MODE AUTH ============

    const { elderId } = await req.json();

    if (!elderId) {
      throw new Error('elderId is required');
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get elder details
    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .select('id, full_name, preferred_language, whatsapp_number, phone_number, medical_conditions, family_member_id')
      .eq('id', elderId)
      .single();

    if (elderError || !elder) {
      return new Response(
        JSON.stringify({ error: 'Elder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ AUTHORIZATION (only for user JWT calls) ============
    if (!isServiceRole && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isOwner = profile.id === elder.family_member_id;
      
      if (!isOwner) {
        const { data: accessRecord } = await supabase
          .from("elder_access")
          .select("id")
          .eq("elder_id", elderId)
          .eq("user_id", userId)
          .single();
        
        if (!accessRecord) {
          return new Response(
            JSON.stringify({ error: 'Forbidden - Not authorized for this elder' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // ============ END AUTHORIZATION ============

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

    console.log('Sending WhatsApp message:', {
      from: twilioWhatsAppNumber,
      to: whatsappNumber,
      elderName: elder.full_name,
      isServiceRole,
    });

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

    const twilioData = await twilioResponse.json();
    
    console.log('Twilio full response:', JSON.stringify(twilioData));

    if (!twilioResponse.ok) {
      console.error('Twilio error details:', {
        status: twilioResponse.status,
        code: twilioData.code,
        message: twilioData.message,
        moreInfo: twilioData.more_info,
      });
      throw new Error(`Failed to send WhatsApp message: ${twilioData.message || twilioResponse.statusText}`);
    }

    console.log('WhatsApp check-in sent successfully:', {
      sid: twilioData.sid,
      status: twilioData.status,
      to: twilioData.to,
    });

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
