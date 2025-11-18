import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, elderName, userMessage, conversationHistory, medicines } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context-aware system prompt
    const systemPrompt = `You are a caring healthcare assistant for ${elderName} via WhatsApp.

Your role:
1. Check on their medicine intake
2. Ask about symptoms and well-being
3. Detect concerning health issues
4. Keep responses SHORT (2-3 sentences max for WhatsApp)

Current Medicines:
${medicines.map((m: any) => `- ${m.name} (${m.dosage})`).join('\n')}

CRITICAL ALERTS:
- If they mention: severe pain, chest pain, breathing issues, dizziness, falls, confusion → Flag as emergency
- If they forgot multiple medicines → Alert family
- If they sound unwell or report worsening symptoms → Alert family

Keep your tone warm, friendly, and conversational. Use their language.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Analyze for emergency keywords
    const emergencyKeywords = ['severe', 'chest pain', 'can\'t breathe', 'fell down', 'confused', 'dizzy', 'emergency'];
    const isEmergency = emergencyKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) || 
      aiResponse.toLowerCase().includes('alert') ||
      aiResponse.toLowerCase().includes('emergency')
    );

    // Sentiment analysis
    const negativePhrases = ['not good', 'bad', 'worse', 'pain', 'sick', 'forgot'];
    const sentiment = negativePhrases.some(phrase => userMessage.toLowerCase().includes(phrase))
      ? 'negative'
      : 'positive';

    console.log('AI WhatsApp response generated:', {
      elderId,
      isEmergency,
      sentiment,
      responseLength: aiResponse.length
    });

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        isEmergency,
        sentiment,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in WhatsApp AI chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
