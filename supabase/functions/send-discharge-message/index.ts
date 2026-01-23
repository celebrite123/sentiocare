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
    const { patientId } = await req.json();

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: "patientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get patient details with organization info
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          name,
          hospital_contact_number,
          discharge_message_template
        )
      `)
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: "Patient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format medicine list
    const medicines = patient.medicine_list || [];
    const medicineText = medicines.length > 0
      ? medicines.map((m: any) => `• ${m.name} - ${m.dosage} (${m.timing})`).join("\n")
      : "As prescribed by your doctor";

    // Format red flag symptoms
    const redFlags = patient.red_flag_symptoms || [];
    const redFlagText = redFlags.length > 0
      ? redFlags.join(", ")
      : "Fever, severe pain, difficulty breathing, excessive bleeding";

    // Build discharge message
    const hospitalName = patient.organizations?.name || "Hospital";
    const hospitalContact = patient.organizations?.hospital_contact_number || "our hospital";
    const followUpDate = patient.follow_up_date 
      ? new Date(patient.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "As advised";

    const message = `🏥 *${hospitalName}* Discharge Summary

Dear ${patient.patient_name},

You were discharged on ${new Date(patient.discharge_date).toLocaleDateString("en-IN")}.

💊 *Medicines:*
${medicineText}

⚠️ *Watch for these symptoms:*
${redFlagText}

📅 *Follow-up:* ${followUpDate}

📞 Need help? Reply *HELP* or call ${hospitalContact}

Take care! 🙏`;

    // Send via Twilio WhatsApp
    const formattedPhone = patient.mobile_number.startsWith("+") 
      ? patient.mobile_number 
      : `+91${patient.mobile_number.replace(/\D/g, "").slice(-10)}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

    const twilioResponse = await fetch(twilioUrl, {
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

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: twilioResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update patient record
    await supabase
      .from("discharged_patients")
      .update({
        discharge_message_sent: true,
        discharge_message_sent_at: new Date().toISOString(),
        discharge_message_sid: twilioResult.sid,
        check_48hr_scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", patientId);

    // Log communication
    await supabase.from("patient_communications").insert({
      patient_id: patientId,
      organization_id: patient.organization_id,
      direction: "outbound",
      channel: "whatsapp",
      content: message,
      message_sid: twilioResult.sid,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: "Discharge message sent successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending discharge message:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
