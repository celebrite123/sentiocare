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
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;
    const bolnaApiKey = Deno.env.get("BOLNA_API_KEY");
    const bolnaAgentId = Deno.env.get("BOLNA_AGENT_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find patients due for 48-hour check
    const now = new Date().toISOString();
    const { data: patients, error: patientsError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          name,
          hospital_contact_number,
          auto_48hr_check
        )
      `)
      .lte("check_48hr_scheduled_at", now)
      .eq("check_48hr_completed", false)
      .eq("status", "active")
      .lt("check_48hr_attempt_count", 3);

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No patients due for 48-hour check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const patient of patients) {
      try {
        // Check organization settings
        if (!patient.organizations?.auto_48hr_check) {
          continue;
        }

        // Increment attempt count
        await supabase
          .from("discharged_patients")
          .update({ 
            check_48hr_attempt_count: (patient.check_48hr_attempt_count || 0) + 1 
          })
          .eq("id", patient.id);

        // Determine method: try voice first, fallback to WhatsApp
        let method = "whatsapp";
        let success = false;

        // Try voice call if Bolna is configured and patient language is supported
        if (bolnaApiKey && bolnaAgentId && patient.language === "hindi") {
          try {
            const voiceResult = await initiateVoiceCheck(
              patient,
              bolnaApiKey,
              bolnaAgentId
            );
            if (voiceResult.success) {
              method = "voice";
              success = true;
              
              // Update patient record
              await supabase
                .from("discharged_patients")
                .update({ check_48hr_method: "voice" })
                .eq("id", patient.id);

              // Log checkin
              await supabase.from("patient_checkins").insert({
                patient_id: patient.id,
                organization_id: patient.organization_id,
                checkin_type: "discharge_48hr",
                method: "voice",
                call_id: voiceResult.callId,
              });
            }
          } catch (voiceError) {
            console.error("Voice call failed, falling back to WhatsApp:", voiceError);
          }
        }

        // Fallback to WhatsApp
        if (!success) {
          const whatsappResult = await sendWhatsAppCheck(
            patient,
            twilioSid,
            twilioToken,
            twilioWhatsAppNumber
          );

          if (whatsappResult.success) {
            method = "whatsapp";
            success = true;

            await supabase
              .from("discharged_patients")
              .update({ check_48hr_method: "whatsapp" })
              .eq("id", patient.id);

            await supabase.from("patient_checkins").insert({
              patient_id: patient.id,
              organization_id: patient.organization_id,
              checkin_type: "discharge_48hr",
              method: "whatsapp",
              message_sid: whatsappResult.messageSid,
            });

            await supabase.from("patient_communications").insert({
              patient_id: patient.id,
              organization_id: patient.organization_id,
              direction: "outbound",
              channel: "whatsapp",
              content: whatsappResult.message,
              message_sid: whatsappResult.messageSid,
              status: "sent",
            });
          }
        }

        results.push({
          patientId: patient.id,
          patientName: patient.patient_name,
          method,
          success,
        });
      } catch (patientError) {
        console.error(`Error processing patient ${patient.id}:`, patientError);
        results.push({
          patientId: patient.id,
          patientName: patient.patient_name,
          error: patientError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error running 48-hour checks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function initiateVoiceCheck(
  patient: any,
  bolnaApiKey: string,
  bolnaAgentId: string
): Promise<{ success: boolean; callId?: string }> {
  const formattedPhone = patient.mobile_number.startsWith("+")
    ? patient.mobile_number
    : `+91${patient.mobile_number.replace(/\D/g, "").slice(-10)}`;

  const medicines = patient.medicine_list || [];
  const medicineNames = medicines.map((m: any) => m.name).join(", ");

  const response = await fetch("https://api.bolna.dev/call", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${bolnaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: bolnaAgentId,
      recipient_phone_number: formattedPhone,
      user_data: {
        patient_name: patient.patient_name,
        medicines: medicineNames,
        discharge_date: patient.discharge_date,
        hospital_name: patient.organizations?.name || "Hospital",
        red_flag_symptoms: (patient.red_flag_symptoms || []).join(", "),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Bolna API error: ${response.status}`);
  }

  const result = await response.json();
  return { success: true, callId: result.call_id };
}

async function sendWhatsAppCheck(
  patient: any,
  twilioSid: string,
  twilioToken: string,
  twilioWhatsAppNumber: string
): Promise<{ success: boolean; messageSid?: string; message?: string }> {
  const formattedPhone = patient.mobile_number.startsWith("+")
    ? patient.mobile_number
    : `+91${patient.mobile_number.replace(/\D/g, "").slice(-10)}`;

  const hospitalName = patient.organizations?.name || "Hospital";

  const message = `Hello ${patient.patient_name}, this is ${hospitalName} checking on you after your discharge.

Quick health check:
1️⃣ Are you taking your medicines regularly?
2️⃣ Do you have any fever, pain, or unusual symptoms?
3️⃣ Do you need any help from the hospital?

Please reply with your answers or type *HELP* if you need assistance.`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${twilioAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${twilioWhatsAppNumber}`,
      To: `whatsapp:${formattedPhone}`,
      Body: message,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio error: ${JSON.stringify(result)}`);
  }

  return { success: true, messageSid: result.sid, message };
}
