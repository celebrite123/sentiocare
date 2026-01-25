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

    const { elderId, elderName, elderPhone, medicines, medicalConditions, preferredLanguage = 'english', isEmergency = false } = await req.json();
    
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
    
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }
    
    if (!VAPI_ASSISTANT_ID) {
      throw new Error('VAPI_ASSISTANT_ID not configured');
    }

    if (!VAPI_PHONE_NUMBER_ID) {
      throw new Error('VAPI_PHONE_NUMBER_ID not configured');
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ AUTHORIZATION CHECK ============
    // Verify user has access to this elder
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("family_member_id, last_manual_call_at")
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      return new Response(
        JSON.stringify({ error: 'Elder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is the family member owner
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, subscription_tier, subscription_status, trial_ends_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
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

    console.log('Initiating Vapi voice call:', {
      elderId,
      elderName,
      phone: elderPhone,
      language: preferredLanguage,
      tier,
      isTrialActive,
      isEmergency,
      userId: user.id
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

    // Fetch caregiver info from notification_settings
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("caregiver_name, caregiver_phone, caregiver_relation")
      .eq("elder_id", elderId)
      .single();

    const hasCaregiver = !!(notificationSettings?.caregiver_name && notificationSettings?.caregiver_phone);

    // Build variable values for Vapi assistant
    const isHindi = preferredLanguage === 'hindi';
    
    const medicineList = medicines.map((m: any) => m.name).join(', ');
    const medicineDetails = medicines.map((m: any) => 
      `${m.name} - ${m.dosage} (${m.timing})`
    ).join('; ');
    
    const conditionsList = (medicalConditions || []).join(', ') || 'None reported';
    const symptomsList = previousSymptoms.length > 0 
      ? previousSymptoms.join(', ') 
      : 'No symptoms reported recently';

    // Create greeting based on language
    const greeting = isHindi 
      ? `नमस्ते ${elderName} जी, मैं Sentio हूं। आज आपकी तबीयत कैसी है?`
      : `Hello ${elderName}, this is Sentio, your health check-in assistant. How are you feeling today?`;

    // Variable values to pass to Vapi assistant
    const variableValues = {
      // Core identification
      elder_id: elderId,
      elder_name: elderName,
      preferred_language: preferredLanguage,
      
      // Greeting
      greeting: greeting,
      
      // Medicine context
      medicines: medicineList || 'No medicines prescribed',
      medicine_details: medicineDetails || 'No medicine details',
      medicine_count: String(medicines?.length || 0),
      
      // Health context
      medical_conditions: conditionsList,
      previous_symptoms: symptomsList,
      recent_concerns: recentConcerns || 'None',
      average_wellbeing: String(averageWellbeing || 'No data'),
      
      // Call metadata
      is_emergency: String(isEmergency),
      check_in_type: isEmergency ? 'emergency_voice' : 'scheduled_voice',
      
      // Caregiver context for emergencies
      has_caregiver: String(hasCaregiver),
      caregiver_name: notificationSettings?.caregiver_name || '',
      caregiver_relation: notificationSettings?.caregiver_relation || '',
      caregiver_phone: notificationSettings?.caregiver_phone || '',
      
      // Emergency intro message
      emergency_intro: isEmergency && hasCaregiver 
        ? `This is an emergency check-in call. If you need help, you can contact ${notificationSettings?.caregiver_name} (${notificationSettings?.caregiver_relation}).`
        : isEmergency 
        ? `This is an emergency check-in call. Please let us know if you need immediate help.`
        : '',
    };

    console.log('Sending variableValues to Vapi:', JSON.stringify(variableValues, null, 2));

    // Make Vapi API call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
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

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text();
      console.error('Vapi API error:', error);
      throw new Error(`Vapi API error: ${error}`);
    }

    const callData = await vapiResponse.json();
    
    console.log('Voice call initiated successfully:', { 
      callId: callData.id,
      language: preferredLanguage,
      medicinesCount: medicines.length,
      previousCheckInsLoaded: previousCheckIns?.length || 0,
      isEmergency
    });

    // Update last_manual_call_at for cooldown tracking
    await supabase
      .from("elders")
      .update({ last_manual_call_at: new Date().toISOString() })
      .eq("id", elderId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.id,
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
