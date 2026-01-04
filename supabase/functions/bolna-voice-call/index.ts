import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, elderName, elderPhone, medicines, medicalConditions, preferredLanguage = 'english' } = await req.json();
    
    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
    const BOLNA_AGENT_ID = Deno.env.get('BOLNA_AGENT_ID');
    
    if (!BOLNA_API_KEY) {
      throw new Error('BOLNA_API_KEY not configured');
    }
    
    if (!BOLNA_AGENT_ID) {
      throw new Error('BOLNA_AGENT_ID not configured');
    }

    console.log('Initiating Bolna voice call:', {
      elderId,
      elderName,
      phone: elderPhone,
      language: preferredLanguage
    });

    // Build user data with context for the AI agent
    const isHindi = preferredLanguage === 'hindi';
    
    const medicineList = medicines.map((m: any) => `${m.name} (${m.dosage}, ${m.timing})`).join(', ');
    const conditionsList = (medicalConditions || []).join(', ') || 'None reported';
    
    const userData = {
      elder_id: elderId,
      elder_name: elderName,
      preferred_language: preferredLanguage,
      medicines: medicineList,
      medical_conditions: conditionsList,
      greeting: isHindi 
        ? `नमस्ते ${elderName} जी, यह Sentio AI से आपकी दैनिक स्वास्थ्य जांच कॉल है।`
        : `Hello ${elderName}, this is your daily health check-in from Sentio AI.`,
      check_in_type: 'voice',
    };

    // Make call using Bolna API
    const bolnaResponse = await fetch('https://api.bolna.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOLNA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: BOLNA_AGENT_ID,
        recipient_phone_number: elderPhone,
        user_data: userData,
      }),
    });

    if (!bolnaResponse.ok) {
      const error = await bolnaResponse.text();
      console.error('Bolna API error:', error);
      throw new Error(`Bolna API error: ${error}`);
    }

    const callData = await bolnaResponse.json();
    
    console.log('Voice call initiated:', { 
      callId: callData.call_id || callData.id,
      language: preferredLanguage 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.call_id || callData.id,
        message: 'Voice call initiated successfully',
        language: preferredLanguage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error initiating voice call:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
