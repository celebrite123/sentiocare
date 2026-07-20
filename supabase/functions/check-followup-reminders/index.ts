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
    // SECURITY: Service-role only endpoint (internal cron/webhook use)
    const _authHeader = req.headers.get('Authorization') || '';
    const _token = _authHeader.replace('Bearer ', '').trim();
    const _srk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!_token || !_srk || _token !== _srk) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking follow-up reminders...");

    // Get today's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayIST = istNow.toISOString().split("T")[0];

    // Calculate dates for reminders
    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const yesterday = new Date(istNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Get all active patients with follow-up dates
    const { data: patients, error: fetchError } = await supabase
      .from("discharged_patients")
      .select("id, patient_name, mobile_number, follow_up_date, organization_id, followup_confirmed")
      .eq("status", "active")
      .not("follow_up_date", "is", null);

    if (fetchError) {
      console.error("Error fetching patients:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${patients?.length || 0} patients with follow-up dates`);

    let alertsCreated = 0;

    for (const patient of patients || []) {
      const followUpDate = patient.follow_up_date;

      // Check if we already have an active alert for this follow-up
      const { data: existingAlert } = await supabase
        .from("b2b_alerts")
        .select("id")
        .eq("patient_id", patient.id)
        .eq("alert_type", "followup_reminder")
        .eq("resolved", false)
        .single();

      if (existingAlert) {
        // Already has an unresolved follow-up alert
        continue;
      }

      let alertData = null;

      // Tomorrow reminder - 1 day before follow-up
      if (followUpDate === tomorrowStr) {
        alertData = {
          organization_id: patient.organization_id,
          patient_id: patient.id,
          alert_type: "followup_reminder",
          severity: "medium",
          title: "Follow-up Appointment Tomorrow",
          description: `${patient.patient_name}'s follow-up appointment is scheduled for tomorrow (${followUpDate}). Please confirm attendance.`,
          sla_deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours SLA
        };
      }
      // Day-of reminder - follow-up is today
      else if (followUpDate === todayIST) {
        alertData = {
          organization_id: patient.organization_id,
          patient_id: patient.id,
          alert_type: "followup_reminder",
          severity: "high",
          title: "Follow-up Appointment Today",
          description: `${patient.patient_name}'s follow-up appointment is TODAY. Please confirm if patient attended.`,
          sla_deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours SLA
        };
      }
      // Overdue - follow-up was yesterday and not confirmed
      else if (followUpDate === yesterdayStr && !patient.followup_confirmed) {
        alertData = {
          organization_id: patient.organization_id,
          patient_id: patient.id,
          alert_type: "followup_reminder",
          severity: "critical",
          title: "Missed Follow-up Appointment",
          description: `${patient.patient_name} missed their follow-up appointment scheduled for ${followUpDate}. Urgent follow-up required.`,
          sla_deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours SLA
        };
      }
      // Check for any follow-up date that has passed without confirmation
      else if (followUpDate < yesterdayStr && !patient.followup_confirmed) {
        alertData = {
          organization_id: patient.organization_id,
          patient_id: patient.id,
          alert_type: "followup_reminder",
          severity: "critical",
          title: "Overdue Follow-up",
          description: `${patient.patient_name} has an overdue follow-up from ${followUpDate}. Contact patient immediately.`,
          sla_deadline: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour SLA
        };
      }

      if (alertData) {
        const { error: insertError } = await supabase
          .from("b2b_alerts")
          .insert(alertData);

        if (insertError) {
          console.error(`Error creating alert for patient ${patient.id}:`, insertError);
        } else {
          alertsCreated++;
          console.log(`Created follow-up alert for patient ${patient.patient_name}`);
        }
      }
    }

    console.log(`Created ${alertsCreated} follow-up reminder alerts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCreated,
        patientsChecked: patients?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
