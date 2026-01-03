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
    const { elderId, elderName, userMessage, conversationHistory, medicines, preferredLanguage = 'english' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const isHindi = preferredLanguage === 'hindi';

    // Build context-aware system prompt based on language
    const systemPrompt = isHindi
      ? `आप WhatsApp पर ${elderName} के लिए एक देखभाल करने वाले स्वास्थ्य सहायक हैं।

आपकी भूमिका:
1. उनकी दवाई लेने की जांच करें
2. लक्षणों और सेहत के बारे में पूछें
3. चिंताजनक स्वास्थ्य समस्याओं का पता लगाएं
4. जवाब छोटे रखें (WhatsApp के लिए 2-3 वाक्य)

वर्तमान दवाइयां:
${medicines.map((m: any) => `- ${m.name} (${m.dosage})`).join('\n')}

महत्वपूर्ण अलर्ट:
- यदि वे उल्लेख करें: तेज दर्द, सीने में दर्द, सांस की तकलीफ, चक्कर, गिरना, भ्रम → आपातकालीन के रूप में चिह्नित करें
- यदि वे कई दवाइयां भूल गए → परिवार को सूचित करें
- यदि वे अस्वस्थ लगते हैं या बिगड़ते लक्षणों की रिपोर्ट करें → परिवार को सूचित करें

हिंदी में बात करें। गर्मजोशी से और दोस्ताना तरीके से बात करें।`
      : `You are a caring healthcare assistant for ${elderName} via WhatsApp.

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

Keep your tone warm, friendly, and conversational. Use English.`;

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

    // Analyze for emergency keywords (both English and Hindi)
    const emergencyKeywords = [
      // English
      'severe', 'chest pain', 'can\'t breathe', 'fell down', 'confused', 'dizzy', 'emergency',
      // Hindi
      'तेज दर्द', 'सीने में दर्द', 'सांस नहीं आ रही', 'गिर गया', 'गिर गई', 'चक्कर', 'आपातकाल', 'बहुत दर्द'
    ];
    const isEmergency = emergencyKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword.toLowerCase()) || 
      aiResponse.toLowerCase().includes('alert') ||
      aiResponse.toLowerCase().includes('emergency') ||
      aiResponse.includes('आपातकालीन')
    );

    // Sentiment analysis (both English and Hindi)
    const negativePhrases = [
      // English
      'not good', 'bad', 'worse', 'pain', 'sick', 'forgot',
      // Hindi
      'अच्छा नहीं', 'बुरा', 'दर्द', 'बीमार', 'भूल गया', 'भूल गई', 'तकलीफ', 'परेशान'
    ];
    const sentiment = negativePhrases.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()))
      ? 'negative'
      : 'positive';

    console.log('AI WhatsApp response generated:', {
      elderId,
      isEmergency,
      sentiment,
      language: preferredLanguage,
      responseLength: aiResponse.length
    });

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        isEmergency,
        sentiment,
        language: preferredLanguage,
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
