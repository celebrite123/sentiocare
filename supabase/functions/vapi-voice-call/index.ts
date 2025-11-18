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
    const { elderId, elderName, elderPhone, medicines, medicalConditions } = await req.json();
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    // Build context-aware system prompt
    const systemPrompt = `You are a compassionate healthcare AI assistant calling ${elderName}.

Your role is to:
1. Greet them warmly and ask about their well-being
2. Check if they have taken their medicines today
3. Ask if they are experiencing any symptoms or health concerns
4. Rate their overall well-being on a scale of 1-10

Current Medicines:
${medicines.map((m: any) => `- ${m.name} (${m.dosage}, ${m.timing})`).join('\n')}

Medical History: ${medicalConditions.join(', ')}

IMPORTANT: 
- Speak naturally and warmly in their preferred language
- If they mention ANY concerning symptoms (severe pain, breathing issues, chest pain, dizziness, confusion), immediately flag this as an emergency
- If they forgot medicines, gently remind them
- Keep the conversation brief (2-3 minutes) but thorough
- Be patient and repeat questions if needed`;

    // Create Vapi phone call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: Deno.env.get('VAPI_PHONE_NUMBER_ID'), // Set this in secrets
        customer: {
          number: elderPhone,
        },
        assistant: {
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            systemPrompt: systemPrompt,
          },
          voice: {
            provider: 'playht',
            voiceId: 'jennifer', // Warm, caring voice
          },
          firstMessage: `Hello ${elderName}, this is your daily health check-in from Sentio AI. How are you feeling today?`,
          recordingEnabled: true,
        },
        metadata: {
          elderId,
          checkInType: 'voice',
        },
      }),
    });

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text();
      console.error('Vapi API error:', error);
      throw new Error(`Vapi API error: ${error}`);
    }

    const callData = await vapiResponse.json();
    
    console.log('Voice call initiated:', callData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.id,
        message: 'Voice call initiated successfully' 
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
