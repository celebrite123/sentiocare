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
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("call_attempts")
      .select(`
        *,
        elders(id, full_name, phone_number, preferred_language, medical_conditions, family_member_id)
      `)
      .eq("status", "no_answer")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now.toISOString())
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

      console.log(`Retrying call for ${elder.full_name} (attempt #${attempt.retry_count + 1})`);

      try {
        // Create a new call attempt for the retry
        const { data: newAttempt, error: insertError } = await supabase
          .from("call_attempts")
          .insert({
            elder_id: elder.id,
            schedule_id: attempt.schedule_id,
            call_type: 'retry',
            attempt_number: attempt.attempt_number + 1,
            retry_count: attempt.retry_count,
            max_retries: attempt.max_retries
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating retry attempt:", insertError);
          continue;
        }

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
            medicines: [],
            medicalConditions: elder.medical_conditions || [],
            preferredLanguage: elder.preferred_language || 'english',
            isEmergency: false
          }),
        });

        const callResult = await callResponse.json();
        
        if (callResult.success && callResult.execution_id) {
          // Update the new attempt with the execution ID
          await supabase
            .from("call_attempts")
            .update({ 
              execution_id: callResult.execution_id,
              status: 'initiated'
            })
            .eq("id", newAttempt.id);

          // Mark the old attempt as retried
          await supabase
            .from("call_attempts")
            .update({ 
              status: 'retried',
              next_retry_at: null
            })
            .eq("id", attempt.id);

          results.push({
            elderId: elder.id,
            elderName: elder.full_name,
            attemptNumber: newAttempt.attempt_number,
            status: 'call_initiated',
            executionId: callResult.execution_id
          });

          console.log(`Retry call initiated for ${elder.full_name}`);

        } else {
          console.error("Call initiation failed:", callResult.error);
          
          // Update the attempt as failed
          await supabase
            .from("call_attempts")
            .update({ 
              status: 'failed',
              next_retry_at: null
            })
            .eq("id", newAttempt.id);

          results.push({
            elderId: elder.id,
            elderName: elder.full_name,
            status: 'call_failed',
            error: callResult.error
          });
        }

      } catch (callError) {
        console.error(`Error processing retry for ${elder.full_name}:`, callError);
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
