import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing call retries...");

    const now = new Date();

    const { data: pendingRetries, error: fetchError } = await supabase
      .from("call_attempts")
      .select(`
        *,
        elders(id, full_name, phone_number, preferred_language, medical_conditions, family_member_id)
      `)
      .eq("status", "no_answer")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now.toISOString())
      .lt("retry_count", 2)
      .order("next_retry_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending retries:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingRetries?.length || 0} pending retries`);

    const results: any[] = [];

    for (const attempt of pendingRetries || []) {
      const elder = attempt.elders;
      
      if (!elder) {
        console.log(`Skipping attempt ${attempt.id} - elder not found`);
        continue;
      }

      // ============ DAILY LIMIT CHECK ============
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      
      const { data: todayCalls } = await supabase
        .from("call_attempts")
        .select("id")
        .eq("elder_id", elder.id)
        .gte("created_at", todayStart.toISOString());
      
      const MAX_CALLS_PER_DAY = 3;
      if (todayCalls && todayCalls.length >= MAX_CALLS_PER_DAY) {
        console.log(`DAILY LIMIT REACHED for elder ${elder.id}: ${todayCalls.length} calls. Cancelling retry.`);
        
        await supabase
          .from("call_attempts")
          .update({ status: 'daily_limit_reached', next_retry_at: null })
          .eq("id", attempt.id);
        
        results.push({ elderId: elder.id, elderName: elder.full_name, status: 'daily_limit_reached', callsToday: todayCalls.length });
        continue;
      }
      // ============ END DAILY LIMIT CHECK ============

      // DEBOUNCE CHECK
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const { data: recentCalls } = await supabase
        .from("call_attempts")
        .select("id, status, created_at")
        .eq("elder_id", elder.id)
        .in("status", ["initiated", "answered"])
        .gte("created_at", fifteenMinsAgo.toISOString())
        .limit(1);

      if (recentCalls && recentCalls.length > 0) {
        console.log(`Skipping retry for elder ${elder.id} - recent call exists`);
        await supabase
          .from("call_attempts")
          .update({ next_retry_at: null, status: 'superseded' })
          .eq("id", attempt.id);
        continue;
      }

      // ============ RETRY COUNT VALIDATION ============
      const currentRetryCount = attempt.retry_count || 0;
      const maxRetries = attempt.max_retries || 2;
      
      if (currentRetryCount >= maxRetries) {
        console.log(`Max retries reached for attempt ${attempt.id}: ${currentRetryCount}/${maxRetries}`);
        await supabase
          .from("call_attempts")
          .update({ status: 'max_retries_reached', next_retry_at: null })
          .eq("id", attempt.id);
        results.push({ elderId: elder.id, elderName: elder.full_name, status: 'max_retries_reached', retryCount: currentRetryCount });
        continue;
      }
      // ============ END RETRY COUNT VALIDATION ============

      console.log(`Retrying call for elder ${elder.id} (attempt #${currentRetryCount + 1}/${maxRetries})`);

      try {
        const newRetryCount = currentRetryCount + 1;
        
        await supabase
          .from("call_attempts")
          .update({ status: 'retrying', retry_count: newRetryCount, next_retry_at: null })
          .eq("id", attempt.id);

        // Get Vapi credentials
        const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
        const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
        const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
        const isHindi = elder.preferred_language === 'hindi';

        if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
          throw new Error('Vapi API credentials not configured');
        }

        // Fetch medicines
        const { data: medicines } = await supabase
          .from("medicines")
          .select("name, dosage, timing, purpose")
          .eq("elder_id", elder.id)
          .eq("active", true);

        const medicineList = (medicines || []).map((m: any) => {
          const name = m.name || '';
          const purpose = m.purpose?.trim() || '';
          if (purpose && name) return `${name} (${purpose})`;
          return purpose || name;
        }).filter(Boolean).join(', ') || (isHindi ? 'कोई दवाई नहीं' : 'No medicines');

        // Get monitoring config
        const { data: elderFull } = await supabase
          .from("elders")
          .select("monitoring_config")
          .eq("id", elder.id)
          .single();
        const monitoringConfig = elderFull?.monitoring_config || { topics: [], custom_questions: [] };

        // Get last check-in context
        const { data: lastCheckin } = await supabase
          .from("check_ins")
          .select("conversation_summary, symptoms_reported, well_being_score, created_at")
          .eq("elder_id", elder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastSummary = lastCheckin?.conversation_summary || '';
        const previousSymptoms = lastCheckin?.symptoms_reported || [];
        
        // Calculate symptom days
        let symptomDays: Record<string, number> = {};
        if (previousSymptoms.length > 0) {
          for (const symptom of previousSymptoms) {
            const { data: firstReport } = await supabase
              .from("check_ins")
              .select("created_at")
              .eq("elder_id", elder.id)
              .contains("symptoms_reported", [symptom])
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (firstReport) {
              symptomDays[symptom] = Math.floor((Date.now() - new Date(firstReport.created_at).getTime()) / (1000 * 60 * 60 * 24));
            }
          }
        }

        const firstName = elder.full_name.split(' ')[0];
        const retryGreeting = isHindi 
          ? `${firstName} जी, हमने पहले फोन किया था। कैसे हैं आप?`
          : `${firstName}, we called earlier. How are you doing?`;

        // Call Vapi API directly
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
              number: elder.phone_number,
            },
            assistantOverrides: {
              variableValues: {
                elder_id: elder.id,
                first_name: firstName,
                greeting: retryGreeting,
                medicines: medicineList,
                is_retry: "true",
                retry_attempt: String(newRetryCount),
                preferred_language: elder.preferred_language || 'english',
                monitoring_topics: buildMonitoringQuestions(monitoringConfig.topics || [], monitoringConfig.custom_questions || [], isHindi),
                last_summary: lastSummary.substring(0, 200),
                active_symptoms: previousSymptoms.join(', '),
                symptom_days: JSON.stringify(symptomDays),
                medical_conditions: (elder.medical_conditions || []).join(', '),
              },
            },
          }),
        });

        if (!vapiResponse.ok) {
          const error = await vapiResponse.text();
          throw new Error(`Vapi API error: ${error}`);
        }

        const callData = await vapiResponse.json();
        const newCallId = callData.id;
        
        // Update the SAME record with new execution ID
        await supabase
          .from("call_attempts")
          .update({ status: 'initiated', execution_id: newCallId, initiated_at: new Date().toISOString() })
          .eq("id", attempt.id);

        console.log(`Retry call initiated for elder ${elder.id}, call_id: ${newCallId}`);

        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          attemptNumber: newRetryCount,
          status: 'call_initiated',
          callId: newCallId,
          callAttemptId: attempt.id
        });

      } catch (callError) {
        console.error(`Error processing retry for ${elder.full_name}:`, callError);
        
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'failed',
            next_retry_at: null,
            failure_reason: callError instanceof Error ? callError.message.substring(0, 200) : 'Unknown retry error',
          })
          .eq("id", attempt.id);
          
        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          status: 'error',
          error: callError instanceof Error ? callError.message : 'Unknown error'
        });
      }
    }

    console.log(`Processed ${results.length} retries`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process call retries error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
