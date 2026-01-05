import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, elderName, elderPhone, medicines, medicalConditions, preferredLanguage = 'english' } = await req.json();
    
    const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
    const BOLNA_AGENT_ID = Deno.env.get('BOLNA_AGENT_ID');
    
    if (!BOLNA_API_KEY) {
      throw new Error('BOLNA_API_KEY not configured');
    }
    
    if (!BOLNA_AGENT_ID) {
      throw new Error('BOLNA_AGENT_ID not configured');
    }

    console.log('Initiating Bolna voice call:', {
      elderId,
      elderName,
      phone: elderPhone,
      language: preferredLanguage
    });

    // Initialize Supabase client to fetch previous check-ins
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Collect all unique symptoms from recent check-ins
      previousCheckIns.forEach(checkIn => {
        if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
          previousSymptoms = [...previousSymptoms, ...checkIn.symptoms_reported];
        }
        if (checkIn.well_being_score) {
          averageWellbeing += checkIn.well_being_score;
          checkInCount++;
        }
      });
      
      // Remove duplicates
      previousSymptoms = [...new Set(previousSymptoms)];
      
      // Calculate average wellbeing
      if (checkInCount > 0) {
        averageWellbeing = Math.round(averageWellbeing / checkInCount);
      }

      // Get most recent concerns/summary
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
    
    // Format medicines list with names prominently
    const medicineList = medicines.map((m: any) => m.name).join(', ');
    const medicineDetails = medicines.map((m: any) => 
      `${m.name} - ${m.dosage} (${m.timing})`
    ).join('; ');
    
    const conditionsList = (medicalConditions || []).join(', ') || 'None reported';
    const symptomsList = previousSymptoms.length > 0 
      ? previousSymptoms.join(', ') 
      : 'No symptoms reported recently';
    
    // Create a structured context object for the Bolna agent
    const userData = {
      // Core identification
      elder_id: elderId,
      elder_name: elderName,
      preferred_language: preferredLanguage,
      
      // Health context
      medicines: medicineList,
      medicine_details: medicineDetails,
      medical_conditions: conditionsList,
      
      // Historical context
      previous_symptoms: symptomsList,
      recent_concerns: recentConcerns,
      average_wellbeing: averageWellbeing || 'No data',
      total_previous_checkins: previousCheckIns?.length || 0,
      
      // Greeting based on language
      greeting: isHindi 
        ? `नमस्ते ${elderName} जी, मैं Sentio AI से बोल रहा हूं। आज आपकी तबीयत कैसी है?`
        : `Hello ${elderName}, this is your health check-in call from Sentio AI. How are you feeling today?`,
      
      // Agent instructions (these help guide the conversation)
      agent_instructions: isHindi
        ? `इस बुजुर्ग का नाम ${elderName} है। इनकी दवाइयां हैं: ${medicineList}। कृपया नाम से संबोधित करें और दवाइयों के बारे में नाम से पूछें।`
        : `This elder's name is ${elderName}. Their medicines are: ${medicineList}. Please address them by name and ask about their medicines by name.`,
      
      check_in_type: 'voice',
    };

    console.log('Sending user_data to Bolna:', JSON.stringify(userData, null, 2));

    // Make call using Bolna API
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
      previousCheckInsLoaded: previousCheckIns?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callData.call_id || callData.id,
        message: 'Voice call initiated successfully',
        language: preferredLanguage,
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
