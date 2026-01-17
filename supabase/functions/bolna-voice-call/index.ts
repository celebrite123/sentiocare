import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_EMERGENCY_CALLS_PER_MONTH = 5;

// Helper to extract first name only
function getFirstName(fullName: string) {
  return fullName.split(' ')[0];
}

// Helper to build a SIMPLE warm greeting - name used ONCE here only
function buildGreeting(firstName: string, isHindi: boolean, daysSinceLastCall: number | null) {
  if (isHindi) {
    if (daysSinceLastCall === null || daysSinceLastCall > 7) {
      return `नमस्ते ${firstName} जी! कैसी तबीयत है आज?`;
    } else if (daysSinceLastCall === 0) {
      return `${firstName} जी, आज फिर बात हो रही है। कैसे हैं?`;
    } else if (daysSinceLastCall === 1) {
      return `${firstName} जी, कल बात हुई थी। आज कैसी तबीयत है?`;
    } else {
      return `${firstName} जी, ${daysSinceLastCall} दिन हो गए। सब ठीक है ना?`;
    }
  } else {
    if (daysSinceLastCall === null || daysSinceLastCall > 7) {
      return `Hello ${firstName}! How are you feeling today?`;
    } else if (daysSinceLastCall === 0) {
      return `${firstName}, good to talk again today. How are you?`;
    } else if (daysSinceLastCall === 1) {
      return `${firstName}, we spoke yesterday. How are you feeling?`;
    } else {
      return `${firstName}, it's been ${daysSinceLastCall} days. How have you been?`;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, elderName, elderPhone, medicines, medicalConditions, preferredLanguage = 'english', isEmergency = false } = await req.json();
    
    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
    const BOLNA_AGENT_ID_ENGLISH = Deno.env.get('BOLNA_AGENT_ID');
    const BOLNA_AGENT_ID_HINDI = Deno.env.get('BOLNA_AGENT_ID_HINDI');
    
    if (!BOLNA_API_KEY) {
      throw new Error('BOLNA_API_KEY not configured');
    }
    
    const isHindi = preferredLanguage === 'hindi';
    const BOLNA_AGENT_ID = isHindi ? BOLNA_AGENT_ID_HINDI : BOLNA_AGENT_ID_ENGLISH;
    
    if (!BOLNA_AGENT_ID) {
      throw new Error(`BOLNA_AGENT_ID${isHindi ? '_HINDI' : ''} not configured`);
    }
    
    console.log('Selected Bolna agent:', { language: preferredLanguage, isHindi });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check subscription and get monitoring config
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("family_member_id, last_manual_call_at, monitoring_config")
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      throw new Error("Elder not found");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, trial_ends_at, monthly_emergency_calls_used, emergency_calls_reset_at")
      .eq("id", elder.family_member_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    const tier = profile?.subscription_tier || "basic";
    const status = profile?.subscription_status || "trial";
    const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const now = new Date();
    const isTrialActive = status === "trial" && trialEndsAt && trialEndsAt > now;
    const canUseVoice = tier === "premium" || isTrialActive;

    if (!canUseVoice) {
      console.log("Voice call blocked - Basic tier without active trial");
      return new Response(
        JSON.stringify({ 
          error: "Voice calls require a Premium subscription.",
          code: "SUBSCRIPTION_REQUIRED"
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check emergency call limits
    if (isEmergency) {
      let emergencyCallsUsed = profile?.monthly_emergency_calls_used || 0;
      const resetAt = profile?.emergency_calls_reset_at ? new Date(profile.emergency_calls_reset_at) : null;
      
      if (resetAt) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (resetAt < monthStart) {
          emergencyCallsUsed = 0;
          await supabase
            .from("profiles")
            .update({ monthly_emergency_calls_used: 0, emergency_calls_reset_at: now.toISOString() })
            .eq("id", elder.family_member_id);
        }
      }

      if (emergencyCallsUsed >= MAX_EMERGENCY_CALLS_PER_MONTH) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return new Response(
          JSON.stringify({ 
            error: `You've used all ${MAX_EMERGENCY_CALLS_PER_MONTH} emergency calls this month. Resets in ${daysUntilReset} days.`,
            code: "EMERGENCY_LIMIT_REACHED"
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from("profiles")
        .update({ 
          monthly_emergency_calls_used: emergencyCallsUsed + 1,
          emergency_calls_reset_at: profile?.emergency_calls_reset_at || now.toISOString()
        })
        .eq("id", elder.family_member_id);
    }

    console.log('Initiating Bolna voice call:', { elderId, isEmergency });

    // Get last check-in for context
    const { data: previousCheckIns } = await supabase
      .from("check_ins")
      .select("created_at, symptoms_reported")
      .eq("elder_id", elderId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Calculate days since last call
    let daysSinceLastCall: number | null = null;
    if (previousCheckIns && previousCheckIns.length > 0) {
      const lastCheckInDate = previousCheckIns[0]?.created_at;
      if (lastCheckInDate) {
        daysSinceLastCall = Math.floor((now.getTime() - new Date(lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Get active symptoms (exclude resolved ones)
    const { data: resolvedSymptomsData } = await supabase
      .from("resolved_symptoms")
      .select("symptom")
      .eq("elder_id", elderId);

    const resolvedSymptomNames = resolvedSymptomsData?.map(s => s.symptom.toLowerCase()) || [];

    let previousSymptoms: string[] = [];
    previousCheckIns?.forEach(checkIn => {
      if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
        previousSymptoms = [...previousSymptoms, ...checkIn.symptoms_reported];
      }
    });
    previousSymptoms = [...new Set(previousSymptoms)];

    const activeSymptoms = previousSymptoms.filter(
      s => !resolvedSymptomNames.some(r => s.toLowerCase().includes(r) || r.includes(s.toLowerCase()))
    );

    // Build SIMPLE, CLEAN user_data - no verbose instructions
    const firstName = getFirstName(elderName);
    const greeting = buildGreeting(firstName, isHindi, daysSinceLastCall);
    const medicineList = medicines.map((m: any) => m.name).join(', ') || (isHindi ? 'कोई नहीं' : 'None');
    const activeSymptomsList = activeSymptoms.length > 0 ? activeSymptoms.slice(0, 2).join(', ') : '';

    // Get monitoring topics and custom questions
    const monitoringConfig = (elder as any).monitoring_config || { topics: [], custom_questions: [] };
    const monitoringTopics = (monitoringConfig.topics || []).join(', ');
    const customQuestions = (monitoringConfig.custom_questions || []).map((q: any) => q.question).join(' | ');

    // SIMPLIFIED user_data - The agent prompt in Bolna Dashboard handles the rest
    const userData = {
      elder_id: elderId,
      first_name: firstName,
      greeting: greeting, // Use {greeting} in Bolna Dashboard Welcome Message
      medicines: medicineList,
      active_symptoms: activeSymptomsList,
      monitoring_topics: monitoringTopics,
      custom_questions: customQuestions,
      is_emergency: isEmergency,
      preferred_language: preferredLanguage,
    };

    console.log('Sending user_data to Bolna:', JSON.stringify(userData));

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
    console.log('Bolna API response:', JSON.stringify(callData));
    
    const callId = callData.execution_id || callData.call_id || callData.id;
    
    // Create call_attempts record
    const { data: callAttempt, error: callAttemptError } = await supabase
      .from("call_attempts")
      .insert({
        elder_id: elderId,
        execution_id: callId,
        call_type: isEmergency ? 'emergency' : 'scheduled',
        status: 'initiated',
        attempt_number: 1,
        retry_count: 0,
        max_retries: 2,
      })
      .select()
      .single();

    if (callAttemptError) {
      console.error("Error creating call attempt record:", callAttemptError);
    } else {
      console.log("Call attempt record created:", callAttempt?.id);
    }
    
    const remainingEmergencyCalls = isEmergency 
      ? MAX_EMERGENCY_CALLS_PER_MONTH - ((profile?.monthly_emergency_calls_used || 0) + 1)
      : MAX_EMERGENCY_CALLS_PER_MONTH - (profile?.monthly_emergency_calls_used || 0);
    
    console.log('Voice call initiated:', { callId, isEmergency, remainingEmergencyCalls });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        execution_id: callId,
        callAttemptId: callAttempt?.id,
        remainingEmergencyCalls,
        message: isEmergency ? 'Emergency call initiated' : 'Check-in call initiated'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error initiating voice call:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initiate call'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
