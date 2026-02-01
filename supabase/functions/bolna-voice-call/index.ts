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
    
    // Check if this is a service role call (internal from run-scheduled-checkins)
    const token = authHeader.replace('Bearer ', '');
    const isServiceRoleCall = token === supabaseServiceKey;
    
    let familyMemberIdForChecks: string | null = null;
    
    if (isServiceRoleCall) {
      // Internal call from run-scheduled-checkins - skip user auth
      // Authorization is handled by the caller (service already verified elder ownership)
      console.log('Internal service call - bypassing user auth for scheduled check-in');
    } else {
      // Dashboard call - require user JWT
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
      
      // Get user's profile to verify ownership
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      familyMemberIdForChecks = profile.id;
    }
    // ============ END AUTHENTICATION CHECK ============

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
    
    console.log('Selected Bolna agent:', { language: preferredLanguage, isHindi, isServiceRoleCall });

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ DAILY CALL LIMIT CHECK ============
    // CRITICAL: Prevent call bombardment - max 3 calls per elder per day
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const { data: todayCalls, error: countError } = await supabase
      .from("call_attempts")
      .select("id, status")
      .eq("elder_id", elderId)
      .gte("created_at", todayStart.toISOString());
    
    const MAX_CALLS_PER_DAY = 3; // 1 scheduled + 2 retries max
    if (todayCalls && todayCalls.length >= MAX_CALLS_PER_DAY) {
      console.log(`DAILY CALL LIMIT REACHED for elder ${elderId}: ${todayCalls.length} calls today`);
      return new Response(
        JSON.stringify({ 
          error: "Daily call limit reached for this elder",
          code: "DAILY_LIMIT_REACHED",
          callsToday: todayCalls.length
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Daily call check passed: ${todayCalls?.length || 0}/${MAX_CALLS_PER_DAY} calls today for elder ${elderId}`);
    // ============ END DAILY CALL LIMIT CHECK ============

    // ============ AUTHORIZATION CHECK ============
    // Verify elder exists and get needed data
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("family_member_id, last_manual_call_at, monitoring_config")
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      return new Response(
        JSON.stringify({ error: 'Elder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For user calls, verify ownership or access
    if (!isServiceRoleCall && familyMemberIdForChecks) {
      const isOwner = familyMemberIdForChecks === elder.family_member_id;
      
      if (!isOwner) {
        const { data: accessRecord } = await supabase
          .from("elder_access")
          .select("id")
          .eq("elder_id", elderId)
          .eq("user_id", familyMemberIdForChecks)
          .single();
        
        if (!accessRecord) {
          return new Response(
            JSON.stringify({ error: 'Forbidden - Not authorized for this elder' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get the family member's profile for subscription checks
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, subscription_tier, subscription_status, trial_ends_at, monthly_emergency_calls_used, emergency_calls_reset_at")
      .eq("id", elder.family_member_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Family member profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ============ END AUTHORIZATION CHECK ============

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

    console.log('Initiating Bolna voice call:', { elderId, isEmergency, isServiceRoleCall });

  // Get last check-in for context (including conversation_summary)
    const { data: previousCheckIns } = await supabase
      .from("check_ins")
      .select("created_at, symptoms_reported, conversation_summary, well_being_score")
      .eq("elder_id", elderId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate days since last call
    let daysSinceLastCall: number | null = null;
    let lastSummary = '';
    if (previousCheckIns && previousCheckIns.length > 0) {
      const lastCheckInDate = previousCheckIns[0]?.created_at;
      if (lastCheckInDate) {
        daysSinceLastCall = Math.floor((now.getTime() - new Date(lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      lastSummary = previousCheckIns[0]?.conversation_summary || '';
    }

    // Get active symptoms (exclude resolved ones) - IMPROVED MATCHING
    const { data: resolvedSymptomsData } = await supabase
      .from("resolved_symptoms")
      .select("symptom, resolved_at")
      .eq("elder_id", elderId);

    // Normalize function for better matching
    const normalizeSymptom = (s: string) => 
      s.toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ')          // Normalize spaces
        .trim();
    
    // Extract key words from symptom for matching
    const getSymptomKeywords = (s: string) => {
      const normalized = normalizeSymptom(s);
      // Common symptom keywords
      const keywords = normalized.split(' ').filter(word => 
        word.length > 2 && !['the', 'and', 'has', 'had', 'was', 'for', 'with'].includes(word)
      );
      return keywords;
    };

    // Check if two symptoms match using keyword overlap
    const symptomsMatch = (s1: string, s2: string): boolean => {
      const n1 = normalizeSymptom(s1);
      const n2 = normalizeSymptom(s2);
      
      // Direct match
      if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
      
      // Keyword matching - if 50%+ keywords overlap, consider it a match
      const k1 = getSymptomKeywords(s1);
      const k2 = getSymptomKeywords(s2);
      const overlap = k1.filter(k => k2.some(kk => kk.includes(k) || k.includes(kk)));
      
      return overlap.length >= Math.min(k1.length, k2.length) * 0.5 && overlap.length > 0;
    };

    const resolvedSymptomsList = resolvedSymptomsData || [];

    let previousSymptoms: string[] = [];
    previousCheckIns?.forEach(checkIn => {
      if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
        previousSymptoms = [...previousSymptoms, ...checkIn.symptoms_reported];
      }
    });
    previousSymptoms = [...new Set(previousSymptoms)];

    // Filter out resolved symptoms with improved matching
    const activeSymptoms = previousSymptoms.filter(symptom => {
      // Check if this symptom matches any resolved symptom
      const isResolved = resolvedSymptomsList.some(resolved => 
        symptomsMatch(symptom, resolved.symptom)
      );
      return !isResolved;
    });

    console.log('Symptom filtering:', { 
      previous: previousSymptoms.length, 
      resolved: resolvedSymptomsList.length, 
      active: activeSymptoms.length 
    });

    // Calculate symptom duration (days since first reported)
    const symptomDaysMap: Record<string, number> = {};
    for (const symptom of activeSymptoms.slice(0, 3)) {
      // Find the earliest check-in where this symptom was reported
      const earliestWithSymptom = previousCheckIns
        ?.filter(c => c.symptoms_reported?.some((s: string) => symptomsMatch(s, symptom)))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      
      if (earliestWithSymptom) {
        const daysSinceFirstReport = Math.floor(
          (now.getTime() - new Date(earliestWithSymptom.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        symptomDaysMap[symptom] = daysSinceFirstReport;
      }
    }

    // Build SIMPLE, CLEAN user_data - no verbose instructions
    const firstName = getFirstName(elderName);
    const greeting = buildGreeting(firstName, isHindi, daysSinceLastCall);
    // Use medicine purpose if available (e.g., "BP medicine"), otherwise just the simple name
    const medicineList = medicines.map((m: any) => {
      if (m.purpose && m.purpose.trim()) {
        return m.purpose;
      }
      // Just use the medicine name without complex dosage details
      return m.name;
    }).join(', ') || (isHindi ? 'कोई दवाई नहीं' : 'No medicines');
    const activeSymptomsList = activeSymptoms.length > 0 ? activeSymptoms.slice(0, 2).join(', ') : '';

    // Get monitoring topics and custom questions
    const monitoringConfig = (elder as any).monitoring_config || { topics: [], custom_questions: [] };
    const monitoringTopics = (monitoringConfig.topics || []).join(', ');
    const customQuestions = (monitoringConfig.custom_questions || []).map((q: any) => q.question).join(' | ');

    // Format symptom days for agent (e.g., "back pain:3, headache:1")
    const symptomDaysFormatted = Object.entries(symptomDaysMap)
      .map(([symptom, days]) => `${symptom}:${days}`)
      .join(', ');

    // ENHANCED user_data with symptom tracking
    const userData = {
      elder_id: elderId,
      first_name: firstName,
      greeting: greeting, // Use {greeting} in Bolna Dashboard Welcome Message
      medicines: medicineList,
      active_symptoms: activeSymptomsList,
      symptom_days: symptomDaysFormatted, // NEW: "back pain:3, headache:1"
      last_summary: lastSummary.substring(0, 150), // NEW: Last call context
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
