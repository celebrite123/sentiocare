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
    const { 
      elderId, 
      elderName, 
      userMessage, 
      conversationHistory, 
      medicines, 
      preferredLanguage = 'english',
      medicalConditions = [],
      previousSymptoms = [],
      recentConcerns = []
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const isHindi = preferredLanguage === 'hindi';
    
    // Build medicine details string
    const medicineDetails = medicines.map((m: any) => 
      `- ${m.name} (${m.dosage}, ${m.timing || m.frequency})`
    ).join('\n') || 'No medicines recorded';

    // Build context strings
    const conditionsStr = medicalConditions?.length > 0 
      ? medicalConditions.join(', ') 
      : 'None recorded';
    
    const previousSymptomsStr = previousSymptoms?.length > 0
      ? previousSymptoms.join(', ')
      : 'None reported recently';

    const recentConcernsStr = recentConcerns?.length > 0
      ? recentConcerns.slice(0, 2).join('; ')
      : 'None';

    // Build context-aware system prompt based on language
    const systemPrompt = isHindi
      ? `आप WhatsApp पर ${elderName} के लिए एक देखभाल करने वाले स्वास्थ्य सहायक हैं।

महत्वपूर्ण नियम:
1. हमेशा ${elderName} नाम से संबोधित करें
2. उनकी दवाइयों का नाम लें
3. खुद को दोहराएं नहीं
4. जवाब छोटे रखें (2-3 वाक्य)

मरीज की जानकारी:
- नाम: ${elderName}
- स्वास्थ्य स्थिति: ${conditionsStr}
- दवाइयां:
${medicineDetails}
- पिछले लक्षण: ${previousSymptomsStr}
- हाल की चिंताएं: ${recentConcernsStr}

आपकी भूमिका:
1. उनकी दवाई लेने की जांच करें (नाम से पूछें)
2. लक्षणों और सेहत के बारे में पूछें
3. पिछली समस्याओं के बारे में follow-up करें

महत्वपूर्ण अलर्ट:
- यदि वे उल्लेख करें: तेज दर्द, सीने में दर्द, सांस की तकलीफ, चक्कर, गिरना, भ्रम → आपातकालीन के रूप में चिह्नित करें

हिंदी में बात करें। गर्मजोशी से बात करें।`
      : `You are a caring healthcare assistant for ${elderName} via WhatsApp.

CRITICAL RULES:
1. ALWAYS address them by name: ${elderName}
2. ALWAYS mention their medicines BY NAME when asking
3. NEVER repeat yourself - track what you've said
4. Keep responses SHORT (2-3 sentences max)

Patient Information:
- Name: ${elderName}
- Medical Conditions: ${conditionsStr}
- Medicines:
${medicineDetails}
- Previous Symptoms: ${previousSymptomsStr}
- Recent Concerns: ${recentConcernsStr}

Your Role:
1. Check medicine intake (ask by name: "Did you take your ${medicines[0]?.name || 'medicines'}?")
2. Ask about symptoms and well-being
3. Follow up on previous concerns if any

CRITICAL ALERTS:
- If they mention: severe pain, chest pain, breathing issues, dizziness, falls, confusion → Flag as emergency
- If they forgot multiple medicines → Alert family
- If they sound unwell or report worsening symptoms → Alert family

Keep your tone warm, friendly, and conversational. Be concise.`;

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
