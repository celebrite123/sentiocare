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
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const isHindi = preferredLanguage === 'hindi';

    // Build context-aware system prompt based on language
    const systemPrompt = isHindi
      ? `आप एक दयालु स्वास्थ्य देखभाल AI सहायक हैं जो ${elderName} को कॉल कर रहे हैं।

आपकी भूमिका:
1. उन्हें गर्मजोशी से नमस्कार करें और उनकी सेहत के बारे में पूछें
2. जांचें कि क्या उन्होंने आज अपनी दवाइयां ली हैं
3. पूछें कि क्या उन्हें कोई लक्षण या स्वास्थ्य संबंधी चिंता है
4. 1-10 के पैमाने पर उनकी समग्र भलाई का मूल्यांकन करें

वर्तमान दवाइयां:
${medicines.map((m: any) => `- ${m.name} (${m.dosage}, ${m.timing})`).join('\n')}

चिकित्सा इतिहास: ${medicalConditions.join(', ')}

महत्वपूर्ण:
- हिंदी में बात करें, गर्मजोशी और प्यार से
- यदि वे किसी चिंताजनक लक्षण का उल्लेख करें (तेज दर्द, सांस की तकलीफ, सीने में दर्द, चक्कर, भ्रम) तो तुरंत आपातकालीन के रूप में चिह्नित करें
- यदि वे दवाई भूल गए, तो धीरे से याद दिलाएं
- बातचीत संक्षिप्त (2-3 मिनट) लेकिन पूर्ण रखें
- धैर्य रखें और जरूरत पड़ने पर सवाल दोहराएं`
      : `You are a compassionate healthcare AI assistant calling ${elderName}.

Your role is to:
1. Greet them warmly and ask about their well-being
2. Check if they have taken their medicines today
3. Ask if they are experiencing any symptoms or health concerns
4. Rate their overall well-being on a scale of 1-10

Current Medicines:
${medicines.map((m: any) => `- ${m.name} (${m.dosage}, ${m.timing})`).join('\n')}

Medical History: ${medicalConditions.join(', ')}

IMPORTANT: 
- Speak naturally and warmly in English
- If they mention ANY concerning symptoms (severe pain, breathing issues, chest pain, dizziness, confusion), immediately flag this as an emergency
- If they forgot medicines, gently remind them
- Keep the conversation brief (2-3 minutes) but thorough
- Be patient and repeat questions if needed`;

    const firstMessage = isHindi
      ? `नमस्ते ${elderName} जी, यह Sentio AI से आपकी दैनिक स्वास्थ्य जांच कॉल है। आज आप कैसा महसूस कर रहे हैं?`
      : `Hello ${elderName}, this is your daily health check-in from Sentio AI. How are you feeling today?`;

    // Create Vapi phone call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: Deno.env.get('VAPI_PHONE_NUMBER_ID'),
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
            voiceId: isHindi ? 'hindi-female' : 'jennifer',
          },
          firstMessage: firstMessage,
          recordingEnabled: true,
        },
        metadata: {
          elderId,
          checkInType: 'voice',
          language: preferredLanguage,
        },
      }),
    });

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text();
      console.error('Vapi API error:', error);
      throw new Error(`Vapi API error: ${error}`);
    }

    const callData = await vapiResponse.json();
    
    console.log('Voice call initiated:', { callId: callData.id, language: preferredLanguage });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.id,
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
