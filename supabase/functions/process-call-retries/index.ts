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
            status: 'superseded' // Mark as superseded by newer call
          })
          .eq("id", attempt.id);
        
        continue;
      }

      console.log(`Retrying call for elder ${elder.id} (attempt #${attempt.retry_count + 1})`);

      try {
        // CRITICAL: Mark the old attempt as 'retried' FIRST to prevent duplicates
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'retried',
            next_retry_at: null
          })
          .eq("id", attempt.id);

        // Fetch medicines for the call
        const { data: medicines } = await supabase
          .from("medicines")
          .select("name, dosage, timing")
          .eq("elder_id", elder.id)
          .eq("active", true);

        // Initiate the retry call via bolna-voice-call
        const callResponse = await fetch(`${supabaseUrl}/functions/v1/bolna-voice-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            elderId: elder.id,
            elderName: elder.full_name,
            elderPhone: elder.phone_number,
            medicines: medicines || [],
            medicalConditions: elder.medical_conditions || [],
            preferredLanguage: elder.preferred_language || 'english',
            isEmergency: false
          }),
        });

        const callResult = await callResponse.json();
        
        if (callResult.success || callResult.execution_id) {
          console.log(`Retry call initiated for elder ${elder.id}, execution_id: ${callResult.execution_id}`);

          results.push({
            elderId: elder.id,
            elderName: elder.full_name,
            attemptNumber: attempt.retry_count + 1,
            status: 'call_initiated',
            executionId: callResult.execution_id
          });

        } else {
          console.error("Call initiation failed:", callResult.error);
          
          // Revert the status back if the call failed to initiate
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
            status: 'call_failed',
            error: callResult.error
          });
        }

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
