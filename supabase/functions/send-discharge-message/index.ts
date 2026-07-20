import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multi-language templates
const getDischargeTemplate = (
  language: string,
  patientName: string,
  hospitalName: string,
  medicineList: string,
  redFlagSymptoms: string,
  followUpDate: string | null,
  hospitalContact: string
): string => {
  const templates: Record<string, string> = {
    hindi: `🏥 *${hospitalName} से डिस्चार्ज सारांश*

नमस्ते ${patientName} जी,

आपका स्वास्थ्य हमारे लिए महत्वपूर्ण है। कृपया निम्न बातों का ध्यान रखें:

💊 *दवाइयाँ:*
${medicineList}

⚠️ *इन लक्षणों पर ध्यान दें:*
${redFlagSymptoms}
${followUpDate ? `\n📅 *अगली विज़िट:* ${followUpDate}` : ""}

🔔 हम 48 घंटे में आपसे संपर्क करेंगे।

कोई समस्या हो तो *HELP* लिखकर भेजें या ${hospitalContact} पर कॉल करें।

स्वस्थ रहें! 🙏`,

    english: `🏥 *Discharge Summary from ${hospitalName}*

Hello ${patientName},

Your health matters to us. Please follow these instructions:

💊 *Medicines:*
${medicineList}

⚠️ *Watch for these symptoms:*
${redFlagSymptoms}
${followUpDate ? `\n📅 *Follow-up Date:* ${followUpDate}` : ""}

🔔 We will check on you in 48 hours.

If you need help, reply *HELP* or call ${hospitalContact}.

Take care! 🙏`,

    tamil: `🏥 *${hospitalName} இலிருந்து வீட்டிற்கு செல்லும் சுருக்கம்*

வணக்கம் ${patientName},

உங்கள் ஆரோக்கியம் எங்களுக்கு முக்கியம்.

💊 *மருந்துகள்:*
${medicineList}

⚠️ *இந்த அறிகுறிகளைக் கவனியுங்கள்:*
${redFlagSymptoms}
${followUpDate ? `\n📅 *அடுத்த சந்திப்பு:* ${followUpDate}` : ""}

🔔 நாங்கள் 48 மணி நேரத்தில் தொடர்பு கொள்வோம்.

உதவி தேவைப்பட்டால் *HELP* என்று பதிலளிக்கவும் அல்லது ${hospitalContact} ஐ அழைக்கவும்.

நல்வாழ்த்துக்கள்! 🙏`,

    telugu: `🏥 *${hospitalName} నుండి డిశ్చార్జ్ సారాంశం*

నమస్తే ${patientName},

మీ ఆరోగ్యం మాకు ముఖ్యం.

💊 *మందులు:*
${medicineList}

⚠️ *ఈ లక్షణాలను గమనించండి:*
${redFlagSymptoms}
${followUpDate ? `\n📅 *తదుపరి సందర్శన:* ${followUpDate}` : ""}

🔔 మేము 48 గంటల్లో మిమ్మల్ని సంప్రదిస్తాము.

సహాయం కావాలంటే *HELP* అని రిప్లై చేయండి లేదా ${hospitalContact} కి కాల్ చేయండి.

జాగ్రత్తగా ఉండండి! 🙏`,

    marathi: `🏥 *${hospitalName} कडून डिस्चार्ज सारांश*

नमस्कार ${patientName},

तुमचे आरोग्य आमच्यासाठी महत्त्वाचे आहे.

💊 *औषधे:*
${medicineList}

⚠️ *या लक्षणांकडे लक्ष द्या:*
${redFlagSymptoms}
${followUpDate ? `\n📅 *पुढील भेट:* ${followUpDate}` : ""}

🔔 आम्ही 48 तासांत तुमच्याशी संपर्क साधू.

मदत हवी असल्यास *HELP* असे लिहून पाठवा किंवा ${hospitalContact} वर कॉल करा.

काळजी घ्या! 🙏`,
  };

  return templates[language] || templates.english;
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
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;

    const { patientId } = await req.json();

    if (!patientId) {
      return new Response(
        JSON.stringify({ error: "patientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get patient with organization details
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          name,
          hospital_contact_number,
          discharge_message_template,
          default_language,
          sms_used_this_month
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
    const medicineList = medicines.length > 0
      ? medicines.map((m: any, i: number) => 
          `${i + 1}. ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.timing ? ` - ${m.timing}` : ""}`
        ).join("\n")
      : "अपने डॉक्टर के निर्देशानुसार दवाइयाँ लें";

    // Format red flag symptoms
    const symptoms = patient.red_flag_symptoms || [];
    const redFlagSymptoms = symptoms.length > 0
      ? symptoms.map((s: string) => `• ${s}`).join("\n")
      : "• तेज़ बुखार\n• सांस लेने में तकलीफ\n• तेज़ दर्द";

    // Format follow-up date
    const followUpDate = patient.follow_up_date
      ? new Date(patient.follow_up_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

    const hospitalName = patient.organizations?.name || "Hospital";
    const hospitalContact = patient.organizations?.hospital_contact_number || "hospital helpline";
    const language = patient.language || patient.organizations?.default_language || "hindi";

    // Build message using template
    const message = getDischargeTemplate(
      language,
      patient.patient_name,
      hospitalName,
      medicineList,
      redFlagSymptoms,
      followUpDate,
      hospitalContact
    );

    // Format phone number for WhatsApp
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

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: twilioResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update patient record
    const now = new Date().toISOString();
    await supabase
      .from("discharged_patients")
      .update({
        discharge_message_sent: true,
        discharge_message_sent_at: now,
        discharge_message_sid: twilioResult.sid,
        check_48hr_scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", patientId);

    // Log the communication
    await supabase.from("patient_communications").insert({
      patient_id: patientId,
      organization_id: patient.organization_id,
      direction: "outbound",
      channel: "whatsapp",
      content: message,
      message_sid: twilioResult.sid,
      status: "sent",
    });

    // Increment SMS usage counter
    await supabase
      .from("organizations")
      .update({
        sms_used_this_month: (patient.organizations?.sms_used_this_month || 0) + 1,
      })
      .eq("id", patient.organization_id);

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioResult.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send discharge message error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
