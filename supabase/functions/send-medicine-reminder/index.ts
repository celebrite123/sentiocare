import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multi-language medicine reminder templates
const getReminderTemplate = (
  language: string,
  patientName: string,
  dayNumber: number,
  medicines: string,
  hospitalName: string
): string => {
  const templates: Record<string, string> = {
    hindi: `🔔 *दवाई रिमाइंडर - दिन ${dayNumber}*

नमस्ते ${patientName} जी,

आज की दवाइयाँ लेना न भूलें:

${medicines}

✅ दवाई लेने के बाद *OK* लिखकर भेजें
❌ कोई समस्या हो तो *HELP* लिखें

${hospitalName} की ओर से 💙`,

    english: `🔔 *Medicine Reminder - Day ${dayNumber}*

Hello ${patientName},

Don't forget to take your medicines today:

${medicines}

✅ Reply *OK* after taking medicines
❌ Reply *HELP* if you have any issues

From ${hospitalName} 💙`,

    tamil: `🔔 *மருந்து நினைவூட்டல் - நாள் ${dayNumber}*

வணக்கம் ${patientName},

இன்று உங்கள் மருந்துகளை எடுக்க மறக்காதீர்கள்:

${medicines}

✅ மருந்து எடுத்த பின் *OK* என்று பதிலளிக்கவும்
❌ பிரச்சனை இருந்தால் *HELP* என்று பதிலளிக்கவும்

${hospitalName} இலிருந்து 💙`,

    telugu: `🔔 *మందుల రిమైండర్ - రోజు ${dayNumber}*

నమస్తే ${patientName},

ఈరోజు మీ మందులు తీసుకోవడం మర్చిపోకండి:

${medicines}

✅ మందులు తీసుకున్న తర్వాత *OK* అని రిప్లై చేయండి
❌ సమస్య ఉంటే *HELP* అని రిప్లై చేయండి

${hospitalName} నుండి 💙`,

    marathi: `🔔 *औषध रिमाइंडर - दिवस ${dayNumber}*

नमस्कार ${patientName},

आज तुमची औषधे घेण्यास विसरू नका:

${medicines}

✅ औषध घेतल्यानंतर *OK* असे लिहून पाठवा
❌ काही समस्या असल्यास *HELP* असे लिहा

${hospitalName} कडून 💙`,
  };

  return templates[language] || templates.english;
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

    // Get current time for scheduling
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find patients who need medicine reminders
    const { data: patients, error: patientsError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          id,
          name,
          auto_medicine_reminders,
          sms_used_this_month
        )
      `)
      .gte("discharge_date", sevenDaysAgo.toISOString().split("T")[0])
      .eq("medicine_reminders_enabled", true)
      .eq("status", "active");

    if (patientsError) {
      console.error("Error fetching patients:", patientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch patients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { patientId: string; patientName: string; success?: boolean; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const patient of patients || []) {
      // Skip if organization has reminders disabled
      if (!patient.organizations?.auto_medicine_reminders) {
        continue;
      }

      // Calculate day number since discharge
      const dischargeDate = new Date(patient.discharge_date);
      const daysSinceDischarge = Math.floor(
        (now.getTime() - dischargeDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const dayNumber = daysSinceDischarge + 1;

      // Skip if more than 7 days
      if (dayNumber > 7) continue;

      try {
        // Format medicines
        const medicines = patient.medicine_list || [];
        const medicineText = medicines.length > 0
          ? medicines.map((m: any, i: number) => 
              `${i + 1}. ${m.name}${m.dosage ? ` (${m.dosage})` : ""}${m.timing ? ` - ${m.timing}` : ""}`
            ).join("\n")
          : "Please take your prescribed medicines";

        const language = patient.language || "hindi";
        const hospitalName = patient.organizations?.name || "Hospital";

        const message = getReminderTemplate(
          language,
          patient.patient_name,
          dayNumber,
          medicineText,
          hospitalName
        );

        // Format phone number
        let phoneNumber = patient.mobile_number.replace(/\D/g, "");
        if (phoneNumber.length === 10) {
          phoneNumber = `+91${phoneNumber}`;
        } else if (!phoneNumber.startsWith("+")) {
          phoneNumber = `+${phoneNumber}`;
        }

        // Send via Twilio
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
            To: `whatsapp:${phoneNumber}`,
            Body: message,
          }),
        });

        const twilioResult = await twilioResponse.json();

        if (twilioResponse.ok) {
          sent++;
          
          // Update patient's medicine day count
          await supabase
            .from("discharged_patients")
            .update({ medicine_day_count: dayNumber })
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
            answered: false,
          });

          // Increment SMS usage
          await supabase
            .from("organizations")
            .update({
              sms_used_this_month: (patient.organizations?.sms_used_this_month || 0) + 1,
            })
            .eq("id", patient.organization_id);

          results.push({
            patientId: patient.id,
            patientName: patient.patient_name,
            success: true,
          });
        } else {
          failed++;
          results.push({
            patientId: patient.id,
            patientName: patient.patient_name,
            error: twilioResult.message || "Twilio error",
          });
        }
      } catch (error: any) {
        failed++;
        results.push({
          patientId: patient.id,
          patientName: patient.patient_name,
          error: error.message,
        });
      }
    }

    console.log(`Medicine reminders sent: ${sent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Medicine reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
