import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALL_COOLDOWN_HOURS = 4;
const MAX_EMERGENCY_CALLS_PER_MONTH = 5;

// Helper to extract first name and create affectionate variations
function getNameVariations(fullName: string, isHindi: boolean) {
  const firstName = fullName.split(' ')[0];
  return {
    firstName,
    shortName: firstName,
    affectionateName: isHindi ? `${firstName} जी` : firstName,
    fullName,
  };
}

// Helper to build warm opening based on days since last call
function getWarmOpening(daysSinceLastCall: number | null, firstName: string, isHindi: boolean) {
  if (isHindi) {
    if (daysSinceLastCall === 0) {
      return `${firstName} जी, आज फिर बात हो रही है। कैसे हैं आप?`;
    } else if (daysSinceLastCall === 1) {
      return `${firstName} जी, कल बात हुई थी। आज कैसी तबीयत है?`;
    } else if (daysSinceLastCall && daysSinceLastCall <= 3) {
      return `${firstName} जी, ${daysSinceLastCall} दिन हो गए। आज कैसा महसूस हो रहा है?`;
    } else if (daysSinceLastCall && daysSinceLastCall <= 7) {
      return `${firstName} जी, कुछ दिन हो गए बात हुए। सब ठीक है ना?`;
    }
    return `नमस्ते ${firstName} जी! आज कैसी तबीयत है?`;
  } else {
    if (daysSinceLastCall === 0) {
      return `${firstName}, good to talk again today. How are you?`;
    } else if (daysSinceLastCall === 1) {
      return `${firstName}, we spoke yesterday. How are you feeling today?`;
    } else if (daysSinceLastCall && daysSinceLastCall <= 3) {
      return `${firstName}, it's been ${daysSinceLastCall} days. How have you been?`;
    } else if (daysSinceLastCall && daysSinceLastCall <= 7) {
      return `${firstName}, it's been a few days. Everything okay?`;
    }
    return `Hello ${firstName}! How are you feeling today?`;
  }
}

// Helper to build positive context from resolved symptoms
function getResolvedContext(resolvedSymptoms: string[], isHindi: boolean) {
  if (resolvedSymptoms.length === 0) return '';
  
  const symptoms = resolvedSymptoms.slice(0, 2).join(isHindi ? ' और ' : ' and ');
  return isHindi
    ? `अच्छी बात है कि आपकी ${symptoms} की तकलीफ ठीक हो गई।`
    : `I'm glad your ${symptoms} has gotten better.`;
}

// Helper to get last check-in mood context
function getLastMoodContext(lastCheckIn: any, isHindi: boolean) {
  if (!lastCheckIn) return '';
  
  const wellbeing = lastCheckIn.well_being_score;
  if (!wellbeing) return '';
  
  if (wellbeing >= 8) {
    return isHindi ? 'पिछली बार आप बहुत अच्छा महसूस कर रहे थे।' : 'You were feeling great last time.';
  } else if (wellbeing >= 6) {
    return isHindi ? 'पिछली बार आप ठीक थे।' : 'You were doing okay last time.';
  } else if (wellbeing >= 4) {
    return isHindi ? 'पिछली बार थोड़ी तकलीफ थी।' : 'You had some discomfort last time.';
  }
  return isHindi ? 'पिछली बार आपने कुछ परेशानी बताई थी।' : 'You mentioned some issues last time.';
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
    
    // Select agent based on preferred language
    const isHindi = preferredLanguage === 'hindi';
    const BOLNA_AGENT_ID = isHindi ? BOLNA_AGENT_ID_HINDI : BOLNA_AGENT_ID_ENGLISH;
    
    if (!BOLNA_AGENT_ID) {
      throw new Error(`BOLNA_AGENT_ID${isHindi ? '_HINDI' : ''} not configured`);
    }
    
    console.log('Selected Bolna agent:', { 
      language: preferredLanguage, 
      agentType: isHindi ? 'Hindi' : 'English',
      agentId: BOLNA_AGENT_ID.substring(0, 8) + '...'
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check subscription tier and cooldown
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("family_member_id, last_manual_call_at")
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      throw new Error("Elder not found");
    }

    // Get the family member's profile to check subscription and emergency call limits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, trial_ends_at, monthly_emergency_calls_used, emergency_calls_reset_at")
      .eq("id", elder.family_member_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Check if user can use voice
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
          error: "Voice calls require a Premium subscription. Please upgrade your plan.",
          code: "SUBSCRIPTION_REQUIRED"
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check emergency call limits
    if (isEmergency) {
      let emergencyCallsUsed = profile?.monthly_emergency_calls_used || 0;
      const resetAt = profile?.emergency_calls_reset_at ? new Date(profile.emergency_calls_reset_at) : null;
      
      // Reset counter if it's a new month
      if (resetAt) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (resetAt < monthStart) {
          emergencyCallsUsed = 0;
          // Reset the counter in the database
          await supabase
            .from("profiles")
            .update({ 
              monthly_emergency_calls_used: 0, 
              emergency_calls_reset_at: now.toISOString() 
            })
            .eq("id", elder.family_member_id);
        }
      }

      if (emergencyCallsUsed >= MAX_EMERGENCY_CALLS_PER_MONTH) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log("Emergency call limit reached:", { emergencyCallsUsed, daysUntilReset });
        return new Response(
          JSON.stringify({ 
            error: `You've used all ${MAX_EMERGENCY_CALLS_PER_MONTH} emergency calls this month. Limit resets in ${daysUntilReset} days.`,
            code: "EMERGENCY_LIMIT_REACHED",
            remainingCalls: 0,
            resetsIn: daysUntilReset
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Increment emergency call counter
      await supabase
        .from("profiles")
        .update({ 
          monthly_emergency_calls_used: emergencyCallsUsed + 1,
          emergency_calls_reset_at: profile?.emergency_calls_reset_at || now.toISOString()
        })
        .eq("id", elder.family_member_id);

      console.log("Emergency call count updated:", emergencyCallsUsed + 1);
    }

    console.log('Initiating Bolna voice call:', {
      elderId,
      language: preferredLanguage,
      tier,
      isTrialActive,
      isEmergency
    });

    // Fetch last 5 check-ins for context
    const { data: previousCheckIns, error: checkInsError } = await supabase
      .from("check_ins")
      .select("created_at, sentiment, well_being_score, medicines_taken, symptoms_reported, conversation_summary")
      .eq("elder_id", elderId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (checkInsError) {
      console.error("Error fetching previous check-ins:", checkInsError);
    }

    // Fetch resolved symptoms - these should NOT be asked about again
    const { data: resolvedSymptomsData, error: resolvedError } = await supabase
      .from("resolved_symptoms")
      .select("symptom, resolved_at")
      .eq("elder_id", elderId)
      .order("resolved_at", { ascending: false })
      .limit(10);

    if (resolvedError) {
      console.error("Error fetching resolved symptoms:", resolvedError);
    }

    const resolvedSymptomNames = resolvedSymptomsData?.map(s => s.symptom.toLowerCase()) || [];
    console.log("Resolved symptoms to exclude:", resolvedSymptomNames);

    // Build context from previous check-ins
    let previousSymptoms: string[] = [];
    let recentConcerns = "";
    let averageWellbeing = 0;
    let checkInCount = 0;
    let daysSinceLastCall: number | null = null;
    
    if (previousCheckIns && previousCheckIns.length > 0) {
      // Calculate days since last call
      const lastCheckInDate = previousCheckIns[0]?.created_at;
      if (lastCheckInDate) {
        const lastDate = new Date(lastCheckInDate);
        daysSinceLastCall = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      previousCheckIns.forEach(checkIn => {
        if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
          previousSymptoms = [...previousSymptoms, ...checkIn.symptoms_reported];
        }
        if (checkIn.well_being_score) {
          averageWellbeing += checkIn.well_being_score;
          checkInCount++;
        }
      });
      
      previousSymptoms = [...new Set(previousSymptoms)];
      
      if (checkInCount > 0) {
        averageWellbeing = Math.round(averageWellbeing / checkInCount);
      }

      const lastCheckIn = previousCheckIns[0];
      if (lastCheckIn.conversation_summary) {
        recentConcerns = lastCheckIn.conversation_summary.substring(0, 200);
      }
      
      console.log("Previous context loaded:", {
        symptomsCount: previousSymptoms.length,
        averageWellbeing,
        hasRecentConcerns: !!recentConcerns,
        daysSinceLastCall
      });
    }

    // Filter out resolved symptoms from active symptoms
    const activeSymptoms = previousSymptoms.filter(
      s => !resolvedSymptomNames.some(r => s.toLowerCase().includes(r) || r.includes(s.toLowerCase()))
    );

    console.log("Active symptoms (after filtering resolved):", activeSymptoms);

    // Fetch caregiver info from notification_settings
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("caregiver_name, caregiver_phone, caregiver_relation")
      .eq("elder_id", elderId)
      .single();

    const hasCaregiver = !!(notificationSettings?.caregiver_name && notificationSettings?.caregiver_phone);

    // Get name variations for warm addressing
    const nameVariations = getNameVariations(elderName, isHindi);
    
    // Build warm opening based on time since last call
    const warmOpening = getWarmOpening(daysSinceLastCall, nameVariations.firstName, isHindi);
    
    // Build positive context from resolved symptoms
    const resolvedContext = getResolvedContext(resolvedSymptomNames.slice(0, 3), isHindi);
    
    // Get last mood context
    const lastMoodContext = getLastMoodContext(previousCheckIns?.[0], isHindi);

    // Build user data with comprehensive context for the AI agent
    const medicineList = medicines.map((m: any) => m.name).join(', ');
    const medicineDetails = medicines.map((m: any) => 
      `${m.name} - ${m.dosage} (${m.timing})`
    ).join('; ');
    
    const conditionsList = (medicalConditions || []).join(', ') || 'None reported';
    
    // Only include ACTIVE symptoms, not resolved ones
    const activeSymptomsList = activeSymptoms.length > 0 
      ? activeSymptoms.join(', ') 
      : '';
    
    const resolvedSymptomsList = resolvedSymptomNames.length > 0
      ? resolvedSymptomNames.join(', ')
      : '';
    
    // Build user_data with symptom tracking context
    // Agent should ASK about symptoms, LISTEN, and FOLLOW UP on unresolved ones
    const userData = {
      // Core identification - ONLY first name for warm conversation
      elder_id: elderId,
      first_name: nameVariations.firstName,
      affectionate_name: nameVariations.affectionateName,
      preferred_language: preferredLanguage,
      
      // Simple warm greeting - use {greeting} in Bolna Dashboard
      greeting: warmOpening,
      
      // Medicine info - THIS IS THE PRIMARY FOCUS
      medicines: medicineList || (isHindi ? 'कोई दवाई नहीं' : 'No medicines'),
      medicine_count: medicines?.length || 0,
      
      // Health context
      medical_conditions: conditionsList,
      
      // ACTIVE SYMPTOMS - unresolved issues to follow up on
      // Agent should ask: "Last time you mentioned [symptom]. Is it better now?"
      active_symptoms: activeSymptomsList || (isHindi ? 'कोई नहीं' : 'None'),
      has_active_symptoms: activeSymptoms.length > 0,
      
      // Resolved symptoms - for positive reinforcement only
      resolved_symptoms: resolvedSymptomsList || '',
      resolved_context: resolvedContext,
      
      // Call metadata
      is_emergency: isEmergency,
      
      // Caregiver context (for escalation only)
      has_caregiver: hasCaregiver,
      caregiver_name: notificationSettings?.caregiver_name || '',
      
      // CRITICAL INSTRUCTIONS - embedded in user_data
      critical_rules: isHindi
        ? `नियम: (1) नाम सिर्फ एक बार। (2) दवाई याद दिलाएं। (3) पूछें "कैसी तबीयत है?" (4) अगर active_symptoms है तो पूछें "पिछली बार [symptom] था, अब कैसा है?" (5) कोई नई तकलीफ सुनें। (6) 2 मिनट में खत्म करें।`
        : `Rules: (1) Name ONCE only. (2) Remind about medicines. (3) Ask "How are you feeling?" (4) If active_symptoms exists, ask "Last time you mentioned [symptom]. How is it now?" (5) Listen for new symptoms. (6) Keep under 2 minutes.`,
      
      // Simple, warm closing
      closing: isHindi
        ? "अपना ख्याल रखिए!"
        : "Take care!",
    };

    console.log('Sending user_data to Bolna:', JSON.stringify(userData, null, 2));

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
    
    console.log('Bolna API full response:', JSON.stringify(callData));
    
    // Bolna returns execution_id, not call_id
    const callId = callData.execution_id || callData.call_id || callData.id;
    
    // Create a call_attempts record to track this call for retry logic
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
      // Don't fail the call if we can't create the tracking record
    } else {
      console.log("Call attempt record created:", callAttempt?.id);
    }
    
    // Get remaining emergency calls
    const remainingEmergencyCalls = isEmergency 
      ? MAX_EMERGENCY_CALLS_PER_MONTH - ((profile?.monthly_emergency_calls_used || 0) + 1)
      : MAX_EMERGENCY_CALLS_PER_MONTH - (profile?.monthly_emergency_calls_used || 0);
    
    console.log('Voice call initiated successfully:', { 
      callId,
      execution_id: callData.execution_id,
      callAttemptId: callAttempt?.id,
      language: preferredLanguage,
      medicinesCount: medicines.length,
      previousCheckInsLoaded: previousCheckIns?.length || 0,
      activeSymptoms: activeSymptoms.length,
      resolvedSymptoms: resolvedSymptomNames.length,
      daysSinceLastCall,
      isEmergency,
      remainingEmergencyCalls
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        execution_id: callData.execution_id,
        callAttemptId: callAttempt?.id,
        message: isEmergency ? 'Emergency voice call initiated' : 'Voice call initiated successfully',
        language: preferredLanguage,
        isEmergency,
        remainingEmergencyCalls,
        contextLoaded: {
          medicines: medicines.length,
          previousCheckIns: previousCheckIns?.length || 0,
          activeSymptoms: activeSymptoms.length,
          resolvedSymptoms: resolvedSymptomNames.length,
          daysSinceLastCall
        }
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
