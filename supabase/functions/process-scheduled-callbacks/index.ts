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

    console.log("Processing scheduled callbacks...");

    const now = new Date().toISOString();

    // Find callbacks that are due (scheduled_for <= now) and still pending
    const { data: dueCallbacks, error: fetchError } = await supabase
      .from("scheduled_callbacks")
      .select(`
        *,
        discharged_patients (
          id,
          patient_name,
          mobile_number,
          language,
          organization_id,
          status,
          consent_given
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(20);

    if (fetchError) {
      console.error("Error fetching callbacks:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueCallbacks?.length || 0} callbacks to process`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const callback of dueCallbacks || []) {
      const patient = callback.discharged_patients;

      // Skip if patient is not active or no consent
      if (!patient || patient.status !== "active" || !patient.consent_given) {
        console.log(`Skipping callback ${callback.id}: Patient inactive or no consent`);
        
        await supabase
          .from("scheduled_callbacks")
          .update({ 
            status: "skipped",
            notes: "Patient inactive or consent not given",
            updated_at: new Date().toISOString()
          })
          .eq("id", callback.id);
        
        skipped++;
        continue;
      }

      // Mark callback as in_progress
      await supabase
        .from("scheduled_callbacks")
        .update({ 
          status: "in_progress",
          updated_at: new Date().toISOString()
        })
        .eq("id", callback.id);

      try {
        // Trigger AI voice call using run-scheduled-b2b-calls with manual trigger
        const { error: callError } = await supabase.functions.invoke(
          "run-scheduled-b2b-calls",
          {
            body: {
              patient_id: patient.id,
              manual_trigger: true,
            },
          }
        );

        if (callError) {
          throw callError;
        }

        // Mark callback as completed
        await supabase
          .from("scheduled_callbacks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", callback.id);

        console.log(`Callback ${callback.id} processed for patient ${patient.patient_name}`);
        processed++;

      } catch (callErr: any) {
        console.error(`Failed to process callback ${callback.id}:`, callErr);

        // Mark callback as failed with retry logic
        const attempts = (callback.notes?.match(/Attempt \d+/) || ["Attempt 0"])[0];
        const attemptNum = parseInt(attempts.split(" ")[1]) + 1;

        if (attemptNum >= 3) {
          // Max retries reached - mark as failed and escalate
          await supabase
            .from("scheduled_callbacks")
            .update({
              status: "failed",
              notes: `${callback.notes || ""}\nAttempt ${attemptNum} failed: ${callErr.message}`,
              escalated: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", callback.id);

          // Create escalation alert
          await supabase.from("b2b_alerts").insert({
            organization_id: callback.organization_id,
            patient_id: patient.id,
            alert_type: "missed_callback",
            severity: "high",
            title: `⚠️ Scheduled callback failed: ${patient.patient_name}`,
            description: `Callback scheduled for ${callback.scheduled_for} failed after ${attemptNum} attempts. Reason: ${callback.reason || "Follow-up call"}`,
            sla_deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour SLA
          });

        } else {
          // Retry in 5 minutes
          await supabase
            .from("scheduled_callbacks")
            .update({
              status: "pending",
              notes: `${callback.notes || ""}\nAttempt ${attemptNum} failed: ${callErr.message}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", callback.id);
        }

        failed++;
      }
    }

    // Check for breached SLA callbacks
    const { data: breachedCallbacks } = await supabase
      .from("scheduled_callbacks")
      .select("id")
      .eq("status", "pending")
      .lt("sla_deadline", now)
      .eq("escalated", false);

    if (breachedCallbacks && breachedCallbacks.length > 0) {
      console.log(`Found ${breachedCallbacks.length} callbacks with breached SLA`);
      
      // Mark as escalated
      await supabase
        .from("scheduled_callbacks")
        .update({ escalated: true })
        .in("id", breachedCallbacks.map(c => c.id));
    }

    console.log(`Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped,
        failed,
        total: dueCallbacks?.length || 0,
        breached_sla: breachedCallbacks?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Callback processor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
