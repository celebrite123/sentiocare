import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALL_COOLDOWN_HOURS = 4;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, elderName, elderPhone, medicines, medicalConditions, preferredLanguage = 'english', isEmergency = false } = await req.json();
    
    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
    const BOLNA_AGENT_ID = Deno.env.get('BOLNA_AGENT_ID');
    
    if (!BOLNA_API_KEY) {
      throw new Error('BOLNA_API_KEY not configured');
    }
    
    if (!BOLNA_AGENT_ID) {
      throw new Error('BOLNA_AGENT_ID not configured');
    }

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

    // Check cooldown (unless emergency)
    if (!isEmergency && elder.last_manual_call_at) {
      const lastCallTime = new Date(elder.last_manual_call_at);
      const now = new Date();
      const hoursSinceCall = (now.getTime() - lastCallTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCall < CALL_COOLDOWN_HOURS) {
        const remainingMinutes = Math.ceil((CALL_COOLDOWN_HOURS * 60) - (hoursSinceCall * 60));
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        
        console.log("Call blocked - cooldown active", { hoursSinceCall, remainingMinutes });
        return new Response(
          JSON.stringify({ 
            error: `Please wait ${hours}h ${mins}m before calling again. Use Emergency Call for urgent situations.`,
            code: "COOLDOWN_ACTIVE",
            remainingMinutes
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get the family member's profile to check subscription
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, trial_ends_at")
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

    console.log('Initiating Bolna voice call:', {
      elderId,
      elderName,
      phone: elderPhone,
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

    // Build context from previous check-ins
    let previousSymptoms: string[] = [];
    let recentConcerns = "";
    let averageWellbeing = 0;
    let checkInCount = 0;
    
    if (previousCheckIns && previousCheckIns.length > 0) {
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
        hasRecentConcerns: !!recentConcerns
      });
    }

    // Build user data with comprehensive context for the AI agent
    const isHindi = preferredLanguage === 'hindi';
    
    const medicineList = medicines.map((m: any) => m.name).join(', ');
    const medicineDetails = medicines.map((m: any) => 
      `${m.name} - ${m.dosage} (${m.timing})`
    ).join('; ');
    
    const conditionsList = (medicalConditions || []).join(', ') || 'None reported';
    const symptomsList = previousSymptoms.length > 0 
      ? previousSymptoms.join(', ') 
      : 'No symptoms reported recently';
    
    const userData = {
      elder_id: elderId,
      elder_name: elderName,
      preferred_language: preferredLanguage,
      medicines: medicineList,
      medicine_details: medicineDetails,
      medical_conditions: conditionsList,
      previous_symptoms: symptomsList,
      recent_concerns: recentConcerns,
      average_wellbeing: averageWellbeing || 'No data',
      total_previous_checkins: previousCheckIns?.length || 0,
      is_emergency: isEmergency,
      greeting: isHindi 
        ? `नमस्ते ${elderName} जी, मैं Sentio AI से बोल रहा हूं। आज आपकी तबीयत कैसी है?`
        : `Hello ${elderName}, this is your health check-in call from Sentio AI. How are you feeling today?`,
      agent_instructions: isHindi
        ? `इस बुजुर्ग का नाम ${elderName} है। इनकी दवाइयां हैं: ${medicineList}। कृपया नाम से संबोधित करें और दवाइयों के बारे में नाम से पूछें।${isEmergency ? ' यह एक आपातकालीन कॉल है।' : ''}`
        : `This elder's name is ${elderName}. Their medicines are: ${medicineList}. Please address them by name and ask about their medicines by name.${isEmergency ? ' This is an EMERGENCY call - be extra attentive.' : ''}`,
      check_in_type: isEmergency ? 'emergency_voice' : 'voice',
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
    
    console.log('Voice call initiated successfully:', { 
      callId: callData.call_id || callData.id,
      language: preferredLanguage,
      medicinesCount: medicines.length,
      previousCheckInsLoaded: previousCheckIns?.length || 0,
      isEmergency
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.call_id || callData.id,
        message: isEmergency ? 'Emergency voice call initiated' : 'Voice call initiated successfully',
        language: preferredLanguage,
        isEmergency,
        contextLoaded: {
          medicines: medicines.length,
          previousCheckIns: previousCheckIns?.length || 0,
          previousSymptoms: previousSymptoms.length
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
