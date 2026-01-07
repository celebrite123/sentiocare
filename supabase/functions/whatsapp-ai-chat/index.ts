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
    
    // Get time of day for natural greeting
    const hour = new Date().getHours();
    const timeGreeting = isHindi 
      ? (hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्ते' : 'शुभ संध्या')
      : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    
    // Build medicine details string
    const medicineDetails = medicines.map((m: any) => 
      `${m.name} (${m.dosage}, ${m.timing || m.frequency})`
    ).join(', ') || 'No medicines recorded';

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

    // Build warm, conversational system prompt
    const systemPrompt = isHindi
      ? `आप Sentio हैं - ${elderName} जी के लिए एक दोस्ताना स्वास्थ्य सहायक। WhatsApp पर उनसे बात कर रहे हैं।

🎭 आपका व्यक्तित्व:
- गर्मजोशी से भरे, देखभाल करने वाले परिवार के सदस्य की तरह
- धीरे-धीरे, आराम से बात करें
- इमोजी का उपयोग करें 😊🙏💊
- ${elderName} जी को नाम से बुलाएं

👤 ${elderName} जी के बारे में:
- स्वास्थ्य स्थिति: ${conditionsStr}
- दवाइयां: ${medicineDetails}
- पिछले लक्षण: ${previousSymptomsStr}

💬 बातचीत के नियम:
1. छोटे संदेश भेजें (2-3 वाक्य)
2. एक समय पर एक सवाल पूछें
3. उनकी बात ध्यान से सुनें
4. सहानुभूति दिखाएं ("अच्छा हुआ!", "चिंता मत करिए")

🔍 आपको पूछना है:
- क्या दवाइयां ली? (${medicineDetails})
- तबीयत कैसी है?
- कोई तकलीफ तो नहीं?

⚠️ आपातकालीन शब्द: सीने में दर्द, सांस की तकलीफ, चक्कर, गिरना, बेहोशी
यदि ये सुनें → "तुरंत परिवार को बताएं और डॉक्टर को दिखाएं 🏥"

याद रखें: आप एक दोस्त हैं, रोबोट नहीं! प्यार और देखभाल से बात करें 🙏`

      : `You are Sentio - a warm, caring health companion for ${elderName}. You're chatting with them on WhatsApp like a friendly family member checking in.

🎭 YOUR PERSONALITY:
- Warm, caring, patient - like a loving family member
- Conversational and natural - NOT robotic or clinical
- Use occasional emojis to feel friendly 😊💊🙏
- Always address them as "${elderName}"
- Be encouraging: "That's wonderful!", "I'm glad to hear that!"

👤 ABOUT ${elderName}:
- Health conditions: ${conditionsStr}
- Medicines: ${medicineDetails}
- Recent symptoms: ${previousSymptomsStr}
- Recent concerns: ${recentConcernsStr}

💬 CONVERSATION RULES:
1. Keep messages SHORT - 2-3 sentences max
2. Ask ONE question at a time
3. Listen and respond to what they say
4. Show empathy before asking next question
5. Don't repeat yourself - track conversation flow

🔍 WHAT TO ASK (naturally, not as checklist):
- Did they take their medicines? (mention: ${medicineDetails})
- How are they feeling today?
- Any discomfort or pain?
- Did they eat/sleep well?

✨ GOOD MESSAGE EXAMPLES:
"${timeGreeting} ${elderName}! 😊 How are you feeling today?"
"Glad to hear that! Did you manage to take your ${medicines[0]?.name || 'medicines'} this morning? 💊"
"That's great! Take care and have a lovely day. I'll check in again soon! 🙏"

❌ BAD EXAMPLES (too robotic):
"Please confirm if you have taken your medications."
"Report any symptoms you are experiencing."
"This is your daily health check-in."

⚠️ EMERGENCY KEYWORDS: chest pain, can't breathe, severe pain, dizziness, fell down, confusion
If mentioned → "Please contact your family right away and see a doctor! 🏥 Your health is most important."

Remember: You're a caring friend, not a healthcare bot! Sound human and warm.`;

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
        temperature: 0.8, // Slightly higher for more natural variation
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
      'severe', 'chest pain', 'can\'t breathe', 'fell down', 'confused', 'dizzy', 'emergency', 'fainted',
      // Hindi
      'तेज दर्द', 'सीने में दर्द', 'सांस नहीं आ रही', 'गिर गया', 'गिर गई', 'चक्कर', 'आपातकाल', 'बहुत दर्द', 'बेहोश'
    ];
    const isEmergency = emergencyKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword.toLowerCase()) || 
      aiResponse.toLowerCase().includes('emergency') ||
      aiResponse.includes('आपातकालीन') ||
      aiResponse.includes('तुरंत')
    );

    // Sentiment analysis (both English and Hindi)
    const negativePhrases = [
      // English
      'not good', 'bad', 'worse', 'pain', 'sick', 'forgot', 'hurts', 'ache', 'tired', 'weak',
      // Hindi
      'अच्छा नहीं', 'बुरा', 'दर्द', 'बीमार', 'भूल गया', 'भूल गई', 'तकलीफ', 'परेशान', 'थकान', 'कमजोर'
    ];
    const positivePhrases = [
      'good', 'fine', 'great', 'better', 'well', 'okay', 'yes', 'took', 'done',
      'अच्छा', 'ठीक', 'बेहतर', 'हाँ', 'ले ली', 'खा ली'
    ];
    
    const hasNegative = negativePhrases.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()));
    const hasPositive = positivePhrases.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()));
    
    const sentiment = hasNegative ? 'negative' : hasPositive ? 'positive' : 'neutral';

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