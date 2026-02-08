import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Find call attempts that need to be retried
    // CRITICAL: Only get records where:
    // 1. status is 'no_answer' (not 'initiated', 'retried', or anything else)
    // 2. next_retry_at is in the past
    // 3. retry_count < max_retries
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("call_attempts")
      .select(`
        *,
        elders(id, full_name, phone_number, preferred_language, medical_conditions, family_member_id)
      `)
      .eq("status", "no_answer")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now.toISOString())
      .lt("retry_count", 2) // Only retry if we haven't hit max
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
      // CRITICAL: Check if elder already received max calls today
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
          .update({ 
            status: 'daily_limit_reached',
            next_retry_at: null
          })
          .eq("id", attempt.id);
        
        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          status: 'daily_limit_reached',
          callsToday: todayCalls.length
        });
        continue;
      }
      // ============ END DAILY LIMIT CHECK ============

      // DEBOUNCE CHECK: Skip if this elder has a recent call in the last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const { data: recentCalls, error: recentError } = await supabase
        .from("call_attempts")
        .select("id, status, created_at")
        .eq("elder_id", elder.id)
        .in("status", ["initiated", "answered"])
        .gte("created_at", fifteenMinsAgo.toISOString())
        .limit(1);

      if (recentCalls && recentCalls.length > 0) {
        console.log(`Skipping retry for elder ${elder.id} - recent call exists:`, recentCalls[0]);
        
        // Clear the retry since there's a recent successful/pending call
        await supabase
          .from("call_attempts")
          .update({ 
            next_retry_at: null,
            status: 'superseded'
          })
          .eq("id", attempt.id);
        
        continue;
      }

      // ============ RETRY COUNT VALIDATION ============
      // Use the SAME record's retry_count, don't create new records
      const currentRetryCount = attempt.retry_count || 0;
      const maxRetries = attempt.max_retries || 2;
      
      if (currentRetryCount >= maxRetries) {
        console.log(`Max retries reached for attempt ${attempt.id}: ${currentRetryCount}/${maxRetries}`);
        
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'max_retries_reached',
            next_retry_at: null
          })
          .eq("id", attempt.id);
        
        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          status: 'max_retries_reached',
          retryCount: currentRetryCount
        });
        continue;
      }
      // ============ END RETRY COUNT VALIDATION ============

      console.log(`Retrying call for elder ${elder.id} (attempt #${currentRetryCount + 1}/${maxRetries})`);

      try {
        // CRITICAL: Update the EXISTING call_attempt record first
        // Mark as 'retrying' to prevent duplicates
        const newRetryCount = currentRetryCount + 1;
        
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'retrying',
            retry_count: newRetryCount,
            next_retry_at: null // Clear to prevent re-pickup
          })
          .eq("id", attempt.id);

        // Get Bolna credentials
        const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
        const isHindi = elder.preferred_language === 'hindi';
        const BOLNA_AGENT_ID = isHindi 
          ? Deno.env.get('BOLNA_AGENT_ID_HINDI') 
          : Deno.env.get('BOLNA_AGENT_ID');

        if (!BOLNA_API_KEY || !BOLNA_AGENT_ID) {
          throw new Error('Bolna API credentials not configured');
        }

        // Fetch medicines for the call
        const { data: medicines } = await supabase
          .from("medicines")
          .select("name, dosage, timing, purpose")
          .eq("elder_id", elder.id)
          .eq("active", true);

        const medicineList = (medicines || []).map((m: any) => 
          m.purpose?.trim() ? m.purpose : m.name
        ).join(', ') || (isHindi ? 'कोई दवाई नहीं' : 'No medicines');

        // ============ FETCH FULL CONTEXT FOR RETRY CALLS ============
        // Get monitoring config
        const { data: elderFull } = await supabase
          .from("elders")
          .select("monitoring_config")
          .eq("id", elder.id)
          .single();
        const monitoringConfig = elderFull?.monitoring_config || { topics: [], custom_questions: [] };

        // Get last check-in summary and symptoms
        const { data: lastCheckin } = await supabase
          .from("check_ins")
          .select("conversation_summary, symptoms_reported, well_being_score, created_at")
          .eq("elder_id", elder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastSummary = lastCheckin?.conversation_summary || '';
        const previousSymptoms = lastCheckin?.symptoms_reported || [];
        
        // Calculate symptom days for continuity
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
              const daysSince = Math.floor((Date.now() - new Date(firstReport.created_at).getTime()) / (1000 * 60 * 60 * 24));
              symptomDays[symptom] = daysSince;
            }
          }
        }
        // ============ END FULL CONTEXT ============

        // Call Bolna API DIRECTLY (don't go through bolna-voice-call to avoid creating new records)
        const bolnaResponse = await fetch('https://api.bolna.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BOLNA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: BOLNA_AGENT_ID,
            recipient_phone_number: elder.phone_number,
            user_data: {
              elder_id: elder.id,
              first_name: elder.full_name.split(' ')[0],
              greeting: isHindi 
                ? `${elder.full_name.split(' ')[0]} जी, हमने पहले फोन किया था। कैसे हैं आप?`
                : `${elder.full_name.split(' ')[0]}, we called earlier. How are you doing?`,
              medicines: medicineList,
              is_retry: true,
              retry_attempt: newRetryCount,
              preferred_language: elder.preferred_language || 'english',
              // Full context for smart retry calls
              monitoring_topics: monitoringConfig.topics || [],
              custom_questions: monitoringConfig.custom_questions || [],
              last_summary: lastSummary.substring(0, 200),
              active_symptoms: previousSymptoms.join(', '),
              symptom_days: JSON.stringify(symptomDays),
              medical_conditions: (elder.medical_conditions || []).join(', '),
            },
          }),
        });

        if (!bolnaResponse.ok) {
          const error = await bolnaResponse.text();
          throw new Error(`Bolna API error: ${error}`);
        }

        const callData = await bolnaResponse.json();
        const newExecutionId = callData.execution_id || callData.call_id || callData.id;
        
        // Update the SAME record with new execution ID
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'initiated',
            execution_id: newExecutionId,
            initiated_at: new Date().toISOString()
          })
          .eq("id", attempt.id);

        console.log(`Retry call initiated for elder ${elder.id}, execution_id: ${newExecutionId}, using SAME record ${attempt.id}`);

        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          attemptNumber: newRetryCount,
          status: 'call_initiated',
          executionId: newExecutionId,
          callAttemptId: attempt.id
        });

      } catch (callError) {
        console.error(`Error processing retry for ${elder.full_name}:`, callError);
        
        // Mark as failed if there was an exception
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'failed',
            next_retry_at: null
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
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Process call retries error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
