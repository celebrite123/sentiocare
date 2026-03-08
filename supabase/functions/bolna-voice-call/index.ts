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
  // Emergency greetings - direct and urgent
  if (isEmergency) {
    if (isHindi) {
      return `${firstName} जी, ये Sentio की तरफ़ से emergency call है। मुझे बताइए, क्या हुआ?`;
    } else {
      return `${firstName}, this is an emergency call from Sentio. Please tell me what happened.`;
    }
  }

  // Use date-based hash for variety so the same elder hears different greetings each day
  const dayHash = new Date().getDate() % 3; // 0, 1, or 2

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

// Format medicine list — PURPOSE-FIRST so the AI asks about the condition, not brand name
// e.g. Hindi: "diabetes ki dawai (sugar)" → AI says "diabetes ki dawai li?"
// e.g. English: "diabetes medicine (sugar)" → AI says "Did you take your diabetes medicine?"
function formatMedicines(medicines: any[], isHindi: boolean): string {
  if (!medicines || medicines.length === 0) {
    return isHindi ? 'कोई दवाई नहीं' : 'No medicines';
  }
  return medicines.map((m: any) => {
    const name = (m.name || '').trim();
    if (!name) return '';
    const purpose = (m.purpose || '').trim();
    if (purpose) {
      // Purpose-first format so AI naturally asks about the condition
      return isHindi 
        ? `${purpose} ki dawai (${name})`
        : `${purpose} medicine (${name})`;
    }
    return name;
  }).filter(Boolean).join(', ');
}

// Extract just the raw medicine names for strict AI reference
function getMedicineNamesOnly(medicines: any[]): string {
  if (!medicines || medicines.length === 0) return '';
  return medicines.map((m: any) => (m.name || '').trim()).filter(Boolean).join(', ');
}

// Build natural-language monitoring questions from topic IDs
function buildMonitoringQuestions(topics: string[], customQuestions: any[], isHindi: boolean): string {
  const questions: string[] = [];
  
  for (const topic of topics) {
    const label = TOPIC_LABELS[topic];
    if (label) {
      questions.push(isHindi ? label.hi : label.en);
    } else {
      // Unknown topic - use the ID as a readable label
      questions.push(isHindi ? `${topic} के बारे में पूछें` : `Ask about ${topic}`);
    }
  }
  
  for (const q of customQuestions) {
    if (q.question) {
      questions.push(q.question);
    }
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ DAILY CALL LIMIT CHECK ============
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const { data: todayCalls, error: countError } = await supabase
      .from("call_attempts")
      .select("id, status")
      .eq("elder_id", elderId)
      .gte("created_at", todayStart.toISOString());
    
    const MAX_CALLS_PER_DAY = 3;
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

    // Get last 7 check-ins for context (prioritize recent)
    const { data: previousCheckIns } = await supabase
      .from("check_ins")
      .select("created_at, symptoms_reported, conversation_summary, well_being_score, medicines_taken, sentiment")
      .eq("elder_id", elderId)
      .order("created_at", { ascending: false })
      .limit(7);

    let daysSinceLastCall: number | null = null;
    let lastSummary = '';
    if (previousCheckIns && previousCheckIns.length > 0) {
      const lastCheckInDate = previousCheckIns[0]?.created_at;
      if (lastCheckInDate) {
        daysSinceLastCall = Math.floor((now.getTime() - new Date(lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      lastSummary = previousCheckIns[0]?.conversation_summary || '';
    }

    // Build recent call summaries (last 3) for raw memory
    const recentCallSummaries = (previousCheckIns || [])
      .slice(0, 3)
      .map((c, i) => {
        const date = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return `[${date}] ${c.conversation_summary || 'No summary'}`;
      })
      .join('\n');

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

    // Track each symptom with its most recent occurrence date for recency sorting
    const symptomRecencyMap = new Map<string, string>(); // symptom -> most recent created_at
    previousCheckIns?.forEach(checkIn => {
      if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
        for (const symptom of checkIn.symptoms_reported) {
          const normalized = normalizeSymptom(symptom);
          const existing = symptomRecencyMap.get(normalized);
          if (!existing || new Date(checkIn.created_at) > new Date(existing)) {
            symptomRecencyMap.set(normalized, checkIn.created_at);
          }
        }
      }
    });

    // Sort by most recent first, then filter out resolved
    const sortedSymptoms = [...symptomRecencyMap.entries()]
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([symptom]) => symptom);

    const activeSymptoms = sortedSymptoms.filter(symptom => {
      const isResolved = resolvedSymptomsList.some(resolved => 
        symptomsMatch(symptom, resolved.symptom)
      );
      return !isResolved;
    });

    console.log('Symptom filtering:', { 
      previous: sortedSymptoms.length, 
      resolved: resolvedSymptomsList.length, 
      active: activeSymptoms.length 
    });

    // Calculate symptom duration
    const symptomDaysMap: Record<string, number> = {};
    for (const symptom of activeSymptoms.slice(0, 3)) {
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

    // Fetch caregiver info from notification_settings
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

    // Build user_data with NATURAL-LANGUAGE monitoring questions
    const firstName = getFirstName(elderName);
    const greeting = buildGreeting(firstName, isHindi, daysSinceLastCall, isEmergency);
    
    // Format medicines with name + purpose for AI context
    const medicineList = formatMedicines(medicines, isHindi);
    
    const activeSymptomsList = activeSymptoms.length > 0 ? activeSymptoms.slice(0, 2).join(', ') : '';

    // Get monitoring config and build natural-language questions
    const monitoringConfig = (elder as any).monitoring_config || { topics: [], custom_questions: [] };
    const monitoringQuestions = buildMonitoringQuestions(
      monitoringConfig.topics || [],
      monitoringConfig.custom_questions || [],
      isHindi
    );

    // Build new concern prompt
    const newConcernPrompt = isHindi 
      ? "कोई नई तकलीफ़ तो नहीं है?"
      : "Any new health concern today?";

    // Build wellbeing question (rotated) — used when no monitoring topics are configured
    const wellbeingQuestions = isHindi
      ? [
          "मन कैसा है आज? खुश हैं?",
          "रात को नींद कैसी आई?",
          "अकेला तो नहीं लगता? कोई मिलने आता है?",
        ]
      : [
          "How's your mood today? Feeling okay?",
          "How did you sleep last night?",
          "Do you feel lonely sometimes? Does anyone visit you?",
        ];
    const dayHash = new Date().getDate() % wellbeingQuestions.length;
    const wellbeingQuestion = wellbeingQuestions[dayHash];

    const symptomDaysFormatted = Object.entries(symptomDaysMap)
      .map(([symptom, days]) => `${symptom}:${days}`)
      .join(', ');

    // ============ GENERATE AI BRIEFING ============
    let briefing = '';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY && !isEmergency) {
      try {
        console.log('Generating AI briefing for call...');
        
        const callHistory = (previousCheckIns || []).map(c => {
          const date = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return `- ${date}: Score ${c.well_being_score}/10, Sentiment: ${c.sentiment || 'unknown'}, Meds taken: ${c.medicines_taken ?? 'unknown'}, Summary: ${c.conversation_summary || 'No details'}`;
        }).join('\n');

        const briefingLang = isHindi ? 'Hindi (Hinglish is fine)' : 'English';
        
        // Build a strict medicine name list for validation
        const actualMedicineNames = (medicines || []).map((m: any) => m.name).filter(Boolean);
        const medicineNameConstraint = actualMedicineNames.length > 0 
          ? `ALLOWED MEDICINE NAMES (use ONLY these exact names, never substitute): ${actualMedicineNames.join(', ')}`
          : 'No medicines prescribed — do not mention any medicine names.';

        const metaPrompt = `Write exactly 3 short bullet points for a voice agent about to call ${firstName}. Max 50 words total.

CONTEXT:
- ${medicineNameConstraint}
- Active symptoms: ${activeSymptomsList || 'None'}
- Symptom days: ${symptomDaysFormatted || 'None'}
- Monitoring topics: ${monitoringQuestions || 'None'}
- Days since last call: ${daysSinceLastCall ?? 'First call ever'}
- Last 3 calls:
${(previousCheckIns || []).slice(0, 3).map(c => `  ${new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: Score ${c.well_being_score}/10, Meds: ${c.medicines_taken ?? '?'}, ${c.conversation_summary || 'No details'}`).join('\n')}

RULES:
• Bullet 1: What happened last call (one sentence).
• Bullet 2: What to ask today — pick ONE medicine from the ALLOWED list above OR one symptom to follow up. NEVER use a medicine name not in the allowed list.
• Bullet 3: One conversation starter if they give brief answers.
• Max 50 words total. No paragraphs. No explanations.
• CRITICAL: Do NOT invent or substitute medicine names. Only use names from the ALLOWED list above.
• Language: ${briefingLang}`;
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: metaPrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          briefing = aiData.choices?.[0]?.message?.content?.trim() || '';
          
          // Post-processing: universal medicine hallucination validator
          // Instead of a hardcoded blocklist, check ALL capitalized words against actual medicine list
          if (actualMedicineNames.length > 0 && briefing) {
            const actualNamesLower = actualMedicineNames.map((n: string) => n.toLowerCase().trim());
            
            // Common English words to skip (not medicine names)
            const commonWords = new Set([
              'the', 'and', 'for', 'with', 'was', 'has', 'had', 'are', 'his', 'her',
              'how', 'did', 'not', 'but', 'ask', 'about', 'check', 'last', 'call',
              'today', 'yesterday', 'score', 'taken', 'said', 'fine', 'well', 'good',
              'feeling', 'pain', 'sleep', 'mood', 'meals', 'water', 'exercise',
              'medicine', 'medicines', 'medication', 'medications', 'meds', 'tablet',
              'dose', 'dosage', 'prescribed', 'doctor', 'follow', 'blood', 'pressure',
              'sugar', 'test', 'report', 'none', 'summary', 'bullet', 'conversation',
              'starter', 'brief', 'answers', 'one', 'two', 'three', 'first', 'second',
              'sentio', 'hello', 'namaste', 'what', 'when', 'where', 'who', 'which',
              'they', 'them', 'that', 'this', 'from', 'been', 'being', 'have', 'will',
              'would', 'could', 'should', 'just', 'also', 'only', 'still', 'some',
              'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
              'such', 'than', 'then', 'very', 'much', 'many', 'same', 'make', 'take',
            ]);
            
            // Find capitalized words that look like medicine names (2+ chars, not common English)
            const capsWordRegex = /\b([A-Z][a-z]{2,}(?:\s*[A-Z][a-z]*)*)\b/g;
            let match;
            const suspectWords: string[] = [];
            while ((match = capsWordRegex.exec(briefing)) !== null) {
              const word = match[1].trim();
              const wordLower = word.toLowerCase();
              if (!commonWords.has(wordLower) && !actualNamesLower.some(n => n.includes(wordLower) || wordLower.includes(n))) {
                // This capitalized word is NOT in the actual medicine list and NOT a common English word
                // Check if it could plausibly be a medicine name (ends in common pharma suffixes or is a known pattern)
                const pharmaSuffixes = ['in', 'ol', 'ide', 'ine', 'ate', 'one', 'ium', 'cin', 'min', 'tin', 'pril', 'tan', 'mab'];
                const looksLikeMedicine = pharmaSuffixes.some(s => wordLower.endsWith(s)) || wordLower.length >= 5;
                if (looksLikeMedicine) {
                  suspectWords.push(word);
                }
              }
            }
            
            // Replace any suspected hallucinated medicine names with the first actual medicine
            for (const suspect of suspectWords) {
              console.warn(`BRIEFING HALLUCINATION DETECTED: "${suspect}" not in actual medicines [${actualMedicineNames.join(', ')}]. Replacing.`);
              const regex = new RegExp(`\\b${suspect}\\b`, 'gi');
              briefing = briefing.replace(regex, actualMedicineNames[0]);
            }
          }
          
          console.log('AI briefing generated:', briefing.substring(0, 100) + '...');
        } else {
          console.error('AI briefing generation failed:', aiResponse.status);
        }
      } catch (briefingError) {
        console.error('Error generating briefing:', briefingError);
        // Non-fatal - continue without briefing
      }
    }
    // ============ END AI BRIEFING ============

    // Build symptom follow-up instruction so AI MUST ask about recent symptoms
    let symptomFollowup = '';
    if (activeSymptoms.length > 0) {
      const topSymptom = activeSymptoms[0];
      const daysAgo = symptomDaysMap[topSymptom] || 0;
      const timeDesc = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      if (isHindi) {
        symptomFollowup = `MANDATORY: पहले "${topSymptom}" के बारे में पूछें (${timeDesc} बताया था)। दवाई के बारे में पूछने से पहले ये पूछें।`;
      } else {
        symptomFollowup = `MANDATORY: Ask about "${topSymptom}" first (reported ${timeDesc}). Ask this BEFORE asking about medicines.`;
      }
    }

    const medicineNamesOnly = getMedicineNamesOnly(medicines);

    // DEFENSIVE: For emergency calls, clear ALL routine data so the agent
    // cannot improvise medicine checks, symptom follow-ups, or monitoring questions.
    // The agent should ONLY follow the emergency flow: ask "kya hua?", listen, acknowledge, end.
    const userData = {
      elder_id: elderId,
      first_name: firstName,
      greeting: greeting,
      briefing: isEmergency ? "" : briefing,
      medicines: isEmergency ? "" : medicineList,
      medicine_names_only: isEmergency ? "" : medicineNamesOnly,
      active_symptoms: isEmergency ? "" : activeSymptomsList,
      symptom_followup: isEmergency ? "" : symptomFollowup,
      symptom_days: isEmergency ? "" : symptomDaysFormatted,
      last_summary: isEmergency ? "" : lastSummary.substring(0, 150),
      recent_calls: isEmergency ? "" : recentCallSummaries.substring(0, 500),
      monitoring_topics: isEmergency ? "" : monitoringQuestions,
      new_concern_prompt: isEmergency ? "" : newConcernPrompt,
      wellbeing_question: isEmergency ? "" : wellbeingQuestion,
      is_emergency: isEmergency ? "true" : "false",
      emergency_intro: emergencyIntro,
      has_caregiver: hasCaregiverFlag ? "true" : "false",
      caregiver_name: caregiverName,
      caregiver_relation: caregiverRelation,
      preferred_language: preferredLanguage,
    };

    console.log('Sending user_data to Bolna:', JSON.stringify(userData));

    // Create call_attempts record BEFORE the API call so we can update failure_reason
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

    // Call Bolna API
    let bolnaResponse: Response;
    try {
      bolnaResponse = await fetch('https://api.bolna.ai/call', {
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
    } catch (fetchError) {
      // Network error - capture failure reason immediately
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error calling Bolna API';
      console.error('Bolna API network error:', errorMsg);
      
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

    if (!bolnaResponse.ok) {
      const errorText = await bolnaResponse.text();
      console.error('Bolna API error:', bolnaResponse.status, errorText);
      
      // Capture failure reason immediately on API error
      if (callAttempt) {
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'failed', 
            failure_reason: `Bolna API ${bolnaResponse.status}: ${errorText.substring(0, 200)}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", callAttempt.id);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Bolna API error: ${errorText}`, callAttemptId: callAttempt?.id }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callData = await bolnaResponse.json();
    console.log('Bolna API response:', JSON.stringify(callData));
    
    const callId = callData.execution_id || callData.call_id || callData.id;
    
    // Update call_attempts with execution_id
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
