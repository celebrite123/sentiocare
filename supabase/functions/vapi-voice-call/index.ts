import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_EMERGENCY_CALLS_PER_MONTH = 5;

function getFirstName(fullName: string) {
  return fullName.split(' ')[0];
}

// Map monitoring topic IDs to natural-language questions
const TOPIC_LABELS: Record<string, { hi: string; en: string }> = {
  meals:          { hi: "खाना कैसा खाया आज?", en: "How were your meals today?" },
  sleep_quality:  { hi: "रात को नींद कैसी आई?", en: "How did you sleep last night?" },
  blood_pressure: { hi: "BP चेक किया? कितना आया?", en: "Did you check your BP? What was the reading?" },
  blood_sugar:    { hi: "Sugar चेक किया? कितना आया?", en: "Did you check your blood sugar? What was it?" },
  water_intake:   { hi: "पानी कितना पिया आज?", en: "How much water did you drink today?" },
  mood:           { hi: "मन कैसा है आज? खुश हैं?", en: "How's your mood today? Feeling happy?" },
  exercise:       { hi: "थोड़ा चले-फिरे आज?", en: "Did you get some exercise or walk today?" },
  pain:           { hi: "कहीं दर्द तो नहीं है?", en: "Are you having any pain?" },
};

function buildGreeting(firstName: string, isHindi: boolean, daysSinceLastCall: number | null, isEmergency: boolean = false) {
  if (isEmergency) {
    if (isHindi) {
      return `${firstName} जी, ये Sentio की तरफ़ से emergency call है। मुझे बताइए, क्या हुआ?`;
    } else {
      return `${firstName}, this is an emergency call from Sentio. Please tell me what happened.`;
    }
  }

  const dayHash = new Date().getDate() % 3;

  if (isHindi) {
    if (daysSinceLastCall === null || daysSinceLastCall > 7) {
      const options = [
        `नमस्ते ${firstName} जी! कैसी तबीयत है आज?`,
        `${firstName} जी, नमस्ते! आज कैसा महसूस कर रहे हैं?`,
        `नमस्ते ${firstName} जी! सब ठीक है? बताइए कैसे हैं।`,
      ];
      return options[dayHash];
    } else if (daysSinceLastCall === 0) {
      const options = [
        `${firstName} जी, आज फिर बात हो रही है। कैसे हैं?`,
        `${firstName} जी, आज दोबारा बात कर रहे हैं। तबीयत कैसी है?`,
        `${firstName} जी, चलिए बताइए आज कैसा लग रहा है?`,
      ];
      return options[dayHash];
    } else if (daysSinceLastCall === 1) {
      const options = [
        `${firstName} जी, कल बात हुई थी। आज कैसी तबीयत है?`,
        `${firstName} जी, नमस्ते! कल के बाद आज कैसा है?`,
        `${firstName} जी, कैसे हैं आज? कल से कोई बदलाव?`,
      ];
      return options[dayHash];
    } else {
      const options = [
        `${firstName} जी, ${daysSinceLastCall} दिन हो गए बात किए। कैसी तबीयत है?`,
        `नमस्ते ${firstName} जी! कुछ दिन हो गए, बताइए कैसे हैं?`,
        `${firstName} जी, कई दिन हो गए। सब ठीक है ना? बताइए।`,
      ];
      return options[dayHash];
    }
  } else {
    if (daysSinceLastCall === null || daysSinceLastCall > 7) {
      const options = [
        `Hello ${firstName}! How are you feeling today?`,
        `Hi ${firstName}! Good to connect with you. How are you doing?`,
        `Hello ${firstName}! How have you been? Tell me how you're feeling.`,
      ];
      return options[dayHash];
    } else if (daysSinceLastCall === 0) {
      const options = [
        `${firstName}, good to talk again today. How are you?`,
        `Hi ${firstName}, checking in again. How's everything going?`,
        `${firstName}, let's catch up. How are you feeling now?`,
      ];
      return options[dayHash];
    } else if (daysSinceLastCall === 1) {
      const options = [
        `${firstName}, we spoke yesterday. How are you feeling today?`,
        `Hi ${firstName}! How's today going compared to yesterday?`,
        `${firstName}, good to hear from you again. How are things today?`,
      ];
      return options[dayHash];
    } else {
      const options = [
        `${firstName}, it's been ${daysSinceLastCall} days. How have you been?`,
        `Hi ${firstName}! It's been a few days. How are you doing?`,
        `Hello ${firstName}! Been a little while. Tell me how you're feeling.`,
      ];
      return options[dayHash];
    }
  }
}

function formatMedicines(medicines: any[], isHindi: boolean): string {
  if (!medicines || medicines.length === 0) {
    return isHindi ? 'कोई दवाई नहीं' : 'No medicines';
  }
  return medicines.map((m: any) => {
    const name = m.name || '';
    const purpose = m.purpose?.trim() || '';
    if (purpose && name) return `${name} (${purpose})`;
    return purpose || name;
  }).filter(Boolean).join(', ');
}

function buildMonitoringQuestions(topics: string[], customQuestions: any[], isHindi: boolean): string {
  const questions: string[] = [];
  for (const topic of topics) {
    const label = TOPIC_LABELS[topic];
    if (label) {
      questions.push(isHindi ? label.hi : label.en);
    } else {
      questions.push(isHindi ? `${topic} के बारे में पूछें` : `Ask about ${topic}`);
    }
  }
  for (const q of customQuestions) {
    if (q.question) questions.push(q.question);
  }
  return questions.join(' | ');
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
    
    const token = authHeader.replace('Bearer ', '');
    const isServiceRoleCall = token === supabaseServiceKey;
    
    let familyMemberIdForChecks: string | null = null;
    
    if (isServiceRoleCall) {
      console.log('Internal service call - bypassing user auth for scheduled check-in');
    } else {
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
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
    
    if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not configured');
    if (!VAPI_ASSISTANT_ID) throw new Error('VAPI_ASSISTANT_ID not configured');
    if (!VAPI_PHONE_NUMBER_ID) throw new Error('VAPI_PHONE_NUMBER_ID not configured');

    const isHindi = preferredLanguage === 'hindi';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ DAILY CALL LIMIT CHECK ============
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const { data: todayCalls } = await supabase
      .from("call_attempts")
      .select("id, status")
      .eq("elder_id", elderId)
      .gte("created_at", todayStart.toISOString());
    
    const MAX_CALLS_PER_DAY = 3;
    if (todayCalls && todayCalls.length >= MAX_CALLS_PER_DAY) {
      console.log(`DAILY CALL LIMIT REACHED for elder ${elderId}: ${todayCalls.length} calls today`);
      return new Response(
        JSON.stringify({ error: "Daily call limit reached for this elder", code: "DAILY_LIMIT_REACHED", callsToday: todayCalls.length }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ============ END DAILY CALL LIMIT CHECK ============

    // ============ AUTHORIZATION CHECK ============
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
      return new Response(
        JSON.stringify({ error: "Voice calls require a Premium subscription.", code: "SUBSCRIPTION_REQUIRED" }),
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
          JSON.stringify({ error: `You've used all ${MAX_EMERGENCY_CALLS_PER_MONTH} emergency calls this month. Resets in ${daysUntilReset} days.`, code: "EMERGENCY_LIMIT_REACHED" }),
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

    console.log('Initiating Vapi voice call:', { elderId, isEmergency, isServiceRoleCall });

    // Get last check-ins for context
    const { data: previousCheckIns } = await supabase
      .from("check_ins")
      .select("created_at, symptoms_reported, conversation_summary, well_being_score")
      .eq("elder_id", elderId)
      .order("created_at", { ascending: false })
      .limit(10);

    let daysSinceLastCall: number | null = null;
    let lastSummary = '';
    if (previousCheckIns && previousCheckIns.length > 0) {
      const lastCheckInDate = previousCheckIns[0]?.created_at;
      if (lastCheckInDate) {
        daysSinceLastCall = Math.floor((now.getTime() - new Date(lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      lastSummary = previousCheckIns[0]?.conversation_summary || '';
    }

    // Get active symptoms (exclude resolved)
    const { data: resolvedSymptomsData } = await supabase
      .from("resolved_symptoms")
      .select("symptom, resolved_at")
      .eq("elder_id", elderId);

    const normalizeSymptom = (s: string) => 
      s.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
    
    const getSymptomKeywords = (s: string) => {
      const normalized = normalizeSymptom(s);
      return normalized.split(' ').filter(word => 
        word.length > 2 && !['the', 'and', 'has', 'had', 'was', 'for', 'with'].includes(word)
      );
    };

    const symptomsMatch = (s1: string, s2: string): boolean => {
      const n1 = normalizeSymptom(s1);
      const n2 = normalizeSymptom(s2);
      if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
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

    const activeSymptoms = previousSymptoms.filter(symptom => {
      return !resolvedSymptomsList.some(resolved => symptomsMatch(symptom, resolved.symptom));
    });

    console.log('Symptom filtering:', { previous: previousSymptoms.length, resolved: resolvedSymptomsList.length, active: activeSymptoms.length });

    // Calculate symptom duration
    const symptomDaysMap: Record<string, number> = {};
    for (const symptom of activeSymptoms.slice(0, 3)) {
      const earliestWithSymptom = previousCheckIns
        ?.filter(c => c.symptoms_reported?.some((s: string) => symptomsMatch(s, symptom)))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      
      if (earliestWithSymptom) {
        symptomDaysMap[symptom] = Math.floor(
          (now.getTime() - new Date(earliestWithSymptom.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // Fetch caregiver info
    const { data: notifSettings } = await supabase
      .from("notification_settings")
      .select("caregiver_name, caregiver_phone, caregiver_relation")
      .eq("elder_id", elderId)
      .single();

    const hasCaregiverFlag = !!(notifSettings?.caregiver_name && notifSettings?.caregiver_phone);
    const caregiverName = notifSettings?.caregiver_name || '';
    const caregiverRelation = notifSettings?.caregiver_relation || '';

    // Build emergency intro
    let emergencyIntro = '';
    if (isEmergency) {
      if (isHindi) {
        emergencyIntro = hasCaregiverFlag
          ? `ये एक emergency call है। अगर ज़रूरत हो तो ${caregiverName} (${caregiverRelation}) को भी call कर सकते हैं।`
          : `ये एक emergency call है। तुरंत doctor से संपर्क करें।`;
      } else {
        emergencyIntro = hasCaregiverFlag
          ? `This is an emergency call. You can also reach ${caregiverName} (${caregiverRelation}) if needed.`
          : `This is an emergency call. Please contact a doctor immediately.`;
      }
    }

    // Build variable values for Vapi assistant
    const firstName = getFirstName(elderName);
    const greeting = buildGreeting(firstName, isHindi, daysSinceLastCall, isEmergency);
    const medicineList = formatMedicines(medicines, isHindi);
    const activeSymptomsList = activeSymptoms.length > 0 ? activeSymptoms.slice(0, 2).join(', ') : '';
    const monitoringConfig = (elder as any).monitoring_config || { topics: [], custom_questions: [] };
    const monitoringQuestions = buildMonitoringQuestions(
      monitoringConfig.topics || [],
      monitoringConfig.custom_questions || [],
      isHindi
    );
    const symptomDaysFormatted = Object.entries(symptomDaysMap)
      .map(([symptom, days]) => `${symptom}:${days}`)
      .join(', ');

    const variableValues = {
      elder_id: elderId,
      first_name: firstName,
      greeting: greeting,
      medicines: medicineList,
      active_symptoms: activeSymptomsList,
      symptom_days: symptomDaysFormatted,
      last_summary: lastSummary.substring(0, 150),
      monitoring_topics: monitoringQuestions,
      is_emergency: isEmergency ? "true" : "false",
      emergency_intro: emergencyIntro,
      has_caregiver: hasCaregiverFlag ? "true" : "false",
      caregiver_name: caregiverName,
      caregiver_relation: caregiverRelation,
      preferred_language: preferredLanguage,
      medicine_count: String(medicines?.length || 0),
      medical_conditions: (medicalConditions || []).join(', ') || 'None reported',
    };

    console.log('Sending variableValues to Vapi:', JSON.stringify(variableValues));

    // Create call_attempts record BEFORE the API call
    const { data: callAttempt, error: callAttemptError } = await supabase
      .from("call_attempts")
      .insert({
        elder_id: elderId,
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
    }

    // Call Vapi API
    let vapiResponse: Response;
    try {
      vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: VAPI_ASSISTANT_ID,
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customer: {
            number: elderPhone,
          },
          assistantOverrides: {
            variableValues: variableValues,
          },
        }),
      });
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error calling Vapi API';
      console.error('Vapi API network error:', errorMsg);
      
      if (callAttempt) {
        await supabase
          .from("call_attempts")
          .update({ status: 'failed', failure_reason: `Network: ${errorMsg}`, completed_at: new Date().toISOString() })
          .eq("id", callAttempt.id);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMsg, callAttemptId: callAttempt?.id }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi API error:', vapiResponse.status, errorText);
      
      if (callAttempt) {
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'failed', 
            failure_reason: `Vapi API ${vapiResponse.status}: ${errorText.substring(0, 200)}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", callAttempt.id);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Vapi API error: ${errorText}`, callAttemptId: callAttempt?.id }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callData = await vapiResponse.json();
    console.log('Vapi API response:', JSON.stringify(callData));
    
    const callId = callData.id;
    
    // Update call_attempts with execution_id (Vapi call ID)
    if (callAttempt) {
      await supabase
        .from("call_attempts")
        .update({ execution_id: callId })
        .eq("id", callAttempt.id);
      console.log("Call attempt record updated with execution_id:", callId);
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
