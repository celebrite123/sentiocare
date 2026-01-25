import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limits by tier (messages per day)
const RATE_LIMITS: Record<string, number> = {
  basic: 100,
  premium: 300,
  trial: 300,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's auth token to verify identity
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
    // ============ END AUTHENTICATION CHECK ============

    const { 
      elderId, 
      elderName, 
      userMessage, 
      conversationHistory, 
      medicines, 
      preferredLanguage = 'english',
      medicalConditions = [],
      previousSymptoms = [],
      recentConcerns = [],
      monitoringTopics = [],
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ AUTHORIZATION CHECK ============
    // Get elder's family member profile for rate limiting and authorization
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("family_member_id")
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      return new Response(
        JSON.stringify({ error: 'Elder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is the family member owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, subscription_tier, subscription_status, trial_ends_at, monthly_api_calls_used, api_calls_reset_at")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check ownership OR access via elder_access table
    const isOwner = profile.id === elder.family_member_id;
    
    if (!isOwner) {
      const { data: accessRecord } = await supabase
        .from("elder_access")
        .select("id")
        .eq("elder_id", elderId)
        .eq("user_id", user.id)
        .single();
      
      if (!accessRecord) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Not authorized for this elder' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ============ END AUTHORIZATION CHECK ============

    // Check rate limits
    const tier = profile.subscription_tier || "basic";
    const status = profile.subscription_status || "trial";
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const now = new Date();
    const isTrialActive = status === "trial" && trialEndsAt && trialEndsAt > now;
    
    const effectiveTier = isTrialActive ? "trial" : tier;
    const limit = RATE_LIMITS[effectiveTier] || RATE_LIMITS.basic;
    
    let apiCallsUsed = profile.monthly_api_calls_used || 0;
    const resetAt = profile.api_calls_reset_at ? new Date(profile.api_calls_reset_at) : null;
    
    // Reset counter if it's a new day
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!resetAt || resetAt < todayStart) {
      apiCallsUsed = 0;
      await supabase
        .from("profiles")
        .update({ monthly_api_calls_used: 0, api_calls_reset_at: now.toISOString() })
        .eq("id", elder.family_member_id);
    }

    if (apiCallsUsed >= limit) {
      console.log("Rate limit exceeded:", { tier: effectiveTier, used: apiCallsUsed, limit });
      return new Response(
        JSON.stringify({ 
          error: `Daily message limit (${limit}) reached. Try again tomorrow.`,
          code: "RATE_LIMIT_EXCEEDED"
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment usage counter
    await supabase
      .from("profiles")
      .update({ monthly_api_calls_used: apiCallsUsed + 1 })
      .eq("id", elder.family_member_id);

    const isHindi = preferredLanguage === 'hindi';
    
    // Get time of day for natural greeting
    const hour = new Date().getHours();
    const timeGreeting = isHindi 
      ? (hour < 12 ? 'Good morning' : hour < 17 ? 'Hello' : 'Good evening')
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

    // Build monitoring context
    const monitoringStr = monitoringTopics.length > 0
      ? monitoringTopics.join(', ')
      : '';

    // Build warm, conversational system prompt
    const hindiPrompt = `You are Sentio - a warm, caring health companion for ${elderName} ji. You're chatting with them on WhatsApp in Hindi.

YOUR PERSONALITY:
- Warm, caring, patient - like a loving family member
- Speak naturally in Hindi (use Devanagari script)
- Use occasional emojis to feel friendly
- Always address them as "${elderName} ji"
- Be encouraging

ABOUT ${elderName}:
- Health conditions: ${conditionsStr}
- Medicines: ${medicineDetails}
- Recent symptoms: ${previousSymptomsStr}
${monitoringStr ? `- Also monitor: ${monitoringStr}` : ''}

CONVERSATION RULES:
1. Keep messages SHORT - 2-3 sentences max
2. Ask ONE question at a time
3. Listen and respond to what they say
4. Show empathy before asking next question

WHAT TO ASK (naturally):
- Did they take their medicines? (${medicineDetails})
- How are they feeling today?
- Any discomfort or pain?
${monitoringStr ? `- Ask about: ${monitoringStr}` : ''}

EMERGENCY KEYWORDS: chest pain, breathing difficulty, dizziness, fell down, unconscious
If mentioned: "Please contact your family right away and see a doctor! Your health is most important."

Remember: You're a caring friend, not a healthcare bot!`;

    const englishPrompt = `You are Sentio - a warm, caring health companion for ${elderName}. You're chatting with them on WhatsApp like a friendly family member checking in.

YOUR PERSONALITY:
- Warm, caring, patient - like a loving family member
- Conversational and natural - NOT robotic or clinical
- Use occasional emojis to feel friendly
- Always address them as "${elderName}"
- Be encouraging: "That's wonderful!", "I'm glad to hear that!"

ABOUT ${elderName}:
- Health conditions: ${conditionsStr}
- Medicines: ${medicineDetails}
- Recent symptoms: ${previousSymptomsStr}
- Recent concerns: ${recentConcernsStr}
${monitoringStr ? `- Also monitor: ${monitoringStr}` : ''}

CONVERSATION RULES:
1. Keep messages SHORT - 2-3 sentences max
2. Ask ONE question at a time
3. Listen and respond to what they say
4. Show empathy before asking next question
5. Don't repeat yourself - track conversation flow

WHAT TO ASK (naturally, not as checklist):
- Did they take their medicines? (mention: ${medicineDetails})
- How are they feeling today?
- Any discomfort or pain?
- Did they eat/sleep well?
${monitoringStr ? `- Ask about: ${monitoringStr}` : ''}

GOOD MESSAGE EXAMPLES:
"${timeGreeting} ${elderName}! How are you feeling today?"
"Glad to hear that! Did you manage to take your ${medicines[0]?.name || 'medicines'} this morning?"
"That's great! Take care and have a lovely day. I'll check in again soon!"

BAD EXAMPLES (too robotic):
"Please confirm if you have taken your medications."
"Report any symptoms you are experiencing."
"This is your daily health check-in."

EMERGENCY KEYWORDS: chest pain, can't breathe, severe pain, dizziness, fell down, confusion
If mentioned: "Please contact your family right away and see a doctor! Your health is most important."

Remember: You're a caring friend, not a healthcare bot! Sound human and warm.`;

    const systemPrompt = isHindi ? hindiPrompt : englishPrompt;

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
        temperature: 0.8,
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
    const emergencyKeywords = [
      'severe', 'chest pain', "can't breathe", 'fell down', 'confused', 'dizzy', 'emergency', 'fainted',
      'heart attack', 'stroke', 'unconscious'
    ];
    const isEmergency = emergencyKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword.toLowerCase()) || 
      aiResponse.toLowerCase().includes('emergency')
    );

    // Sentiment analysis
    const negativePhrases = [
      'not good', 'bad', 'worse', 'pain', 'sick', 'forgot', 'hurts', 'ache', 'tired', 'weak'
    ];
    const positivePhrases = [
      'good', 'fine', 'great', 'better', 'well', 'okay', 'yes', 'took', 'done'
    ];
    
    const hasNegative = negativePhrases.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()));
    const hasPositive = positivePhrases.some(phrase => userMessage.toLowerCase().includes(phrase.toLowerCase()));
    
    const sentiment = hasNegative ? 'negative' : hasPositive ? 'positive' : 'neutral';

    console.log('AI WhatsApp response generated:', {
      elderId,
      isEmergency,
      sentiment,
      language: preferredLanguage,
      responseLength: aiResponse.length,
      userId: user.id
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
