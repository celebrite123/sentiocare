import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackRequest {
  organization_id: string;
  patient_id: string;
  reason: string;
  sla_minutes?: number;
  notify_patient?: boolean;
  assigned_to?: string;
}

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
    const body: CallbackRequest = await req.json();
    const { 
      organization_id, 
      patient_id, 
      reason, 
      sla_minutes = 30, 
      notify_patient = true,
      assigned_to 
    } = body;

    console.log(`Scheduling guaranteed callback for patient ${patient_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select("*, organizations(*)")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found: ${patient_id}`);
    }

    const org = patient.organizations;
    const slaDeadline = new Date(Date.now() + sla_minutes * 60 * 1000);
    const scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Create callback record
    const { data: callback, error: callbackError } = await supabase
      .from("scheduled_callbacks")
      .insert({
        organization_id,
        patient_id,
        scheduled_for: scheduledFor.toISOString(),
        reason,
        status: "pending",
        sla_deadline: slaDeadline.toISOString(),
        assigned_to: assigned_to || null,
        patient_notified: false,
      })
      .select()
      .single();

    if (callbackError) {
      throw new Error(`Failed to create callback: ${callbackError.message}`);
    }

    let patientNotified = false;

    // Send WhatsApp notification to patient
    if (notify_patient && patient.mobile_number) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioWhatsApp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

      if (twilioAccountSid && twilioAuthToken && twilioWhatsApp) {
        const message = patient.language === "english"
          ? `Hello ${patient.patient_name}, this is ${org?.name || "the hospital"}. A nurse will call you within ${sla_minutes} minutes. If you have an urgent concern, please call ${org?.hospital_contact_number || "the hospital"}.`
          : `नमस्ते ${patient.patient_name} जी, यह ${org?.name || "अस्पताल"} से है। एक नर्स ${sla_minutes} मिनट में आपको कॉल करेगी। अगर कोई urgent समस्या है तो ${org?.hospital_contact_number || "अस्पताल"} पर कॉल करें।`;

        try {
          const formData = new URLSearchParams();
          formData.append("To", `whatsapp:+91${patient.mobile_number.replace(/^\+91/, "").replace(/^91/, "")}`);
          formData.append("From", twilioWhatsApp);
          formData.append("Body", message);

          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            }
          );

          if (response.ok) {
            patientNotified = true;
            console.log(`Patient notified via WhatsApp: ${patient.mobile_number}`);

            // Update callback record
            await supabase
              .from("scheduled_callbacks")
              .update({
                patient_notified: true,
                patient_notified_at: new Date().toISOString(),
              })
              .eq("id", callback.id);
          } else {
            const error = await response.text();
            console.error("Failed to notify patient:", error);
          }
        } catch (e) {
          console.error("WhatsApp notification error:", e);
        }
      }

      // Increment SMS counter
      if (patientNotified) {
        try {
          await supabase
            .from("organizations")
            .update({ 
              sms_used_this_month: (org?.sms_used_this_month || 0) + 1 
            })
            .eq("id", organization_id);
        } catch (e) {
          console.error("Failed to increment SMS count:", e);
        }
      }
    }

    // Find and notify an available duty nurse
    if (!assigned_to) {
      const { data: dutyNurse } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("role", "nurse")
        .eq("is_on_duty", true)
        .limit(1)
        .maybeSingle();

      if (dutyNurse && dutyNurse.phone) {
        // Update callback with assigned nurse
        await supabase
          .from("scheduled_callbacks")
          .update({ assigned_to: dutyNurse.id })
          .eq("id", callback.id);

        // Send SMS to duty nurse
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_WHATSAPP_NUMBER")?.replace("whatsapp:", "");

        if (twilioAccountSid && twilioAuthToken && twilioPhone) {
          const nurseMessage = `Callback required: ${patient.patient_name} (${patient.ward || "N/A"}). Reason: ${reason}. SLA: ${sla_minutes} min. Phone: ${patient.mobile_number}`;

          try {
            const formData = new URLSearchParams();
            formData.append("To", dutyNurse.phone);
            formData.append("From", twilioPhone);
            formData.append("Body", nurseMessage);

            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
              }
            );
            console.log(`Duty nurse notified: ${dutyNurse.name}`);
          } catch (e) {
            console.error("Failed to notify duty nurse:", e);
          }
        }
      }
    }

    console.log(`Guaranteed callback scheduled: ${callback.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        callback_id: callback.id,
        scheduled_for: scheduledFor.toISOString(),
        sla_deadline: slaDeadline.toISOString(),
        patient_notified: patientNotified,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Schedule callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
