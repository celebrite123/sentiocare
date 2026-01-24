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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find patients within 7 days of discharge who have reminders enabled
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: patients, error: patientsError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          name,
          auto_medicine_reminders
        )
      `)
      .gte("discharge_date", sevenDaysAgo.toISOString().split("T")[0])
      .eq("medicine_reminders_enabled", true)
      .eq("status", "active");

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No patients due for medicine reminders" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

    const results = [];

    for (const patient of patients) {
      try {
        if (!patient.organizations?.auto_medicine_reminders) {
          continue;
        }

        const daysSinceDischarge = Math.floor(
          (Date.now() - new Date(patient.discharge_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        const medicines = patient.medicine_list || [];
        const medicineText = medicines.length > 0
          ? medicines.map((m: any) => `• ${m.name}`).join("\n")
          : "your prescribed medicines";

        const message = `💊 *Medicine Reminder* (Day ${daysSinceDischarge + 1})

Hi ${patient.patient_name}!

Time for your medicines:
${medicineText}

Did you take them today?
Reply: *YES* ✅ or *NO* ❌`;

        const formattedPhone = patient.mobile_number.startsWith("+")
          ? patient.mobile_number
          : `+91${patient.mobile_number.replace(/\D/g, "").slice(-10)}`;

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

        const twilioResult = await response.json();

        if (response.ok) {
          // Update day count
          await supabase
            .from("discharged_patients")
            .update({ medicine_day_count: daysSinceDischarge + 1 })
            .eq("id", patient.id);

          // Log communication
          await supabase.from("patient_communications").insert({
            patient_id: patient.id,
            organization_id: patient.organization_id,
            direction: "outbound",
            channel: "whatsapp",
            content: message,
            message_sid: twilioResult.sid,
            status: "sent",
          });

          // Log checkin
          await supabase.from("patient_checkins").insert({
            patient_id: patient.id,
            organization_id: patient.organization_id,
            checkin_type: "medicine_reminder",
            method: "whatsapp",
            message_sid: twilioResult.sid,
          });

          results.push({
            patientId: patient.id,
            patientName: patient.patient_name,
            day: daysSinceDischarge + 1,
            success: true,
          });
        } else {
          results.push({
            patientId: patient.id,
            patientName: patient.patient_name,
            error: twilioResult.message || "Send failed",
          });
        }
      } catch (patientError: unknown) {
        const errorMessage = patientError instanceof Error ? patientError.message : "Unknown error";
        console.error(`Error sending reminder to ${patient.id}:`, patientError);
        results.push({
          patientId: patient.id,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => r.error).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending medicine reminders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
