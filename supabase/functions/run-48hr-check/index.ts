import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multi-language 48hr check templates
const get48hrTemplate = (
  language: string,
  patientName: string,
  hospitalName: string,
  hospitalContact: string
): string => {
  const templates: Record<string, string> = {
    hindi: `🏥 *${hospitalName} - स्वास्थ्य जांच*

नमस्ते ${patientName} जी,

घर लौटने के बाद आप कैसा महसूस कर रहे हैं?

कृपया बताएं:
1️⃣ क्या आपने अपनी दवाइयाँ ली हैं? (हाँ/नहीं)
2️⃣ कोई तकलीफ है? (बुखार, दर्द, सांस की तकलीफ आदि)
3️⃣ कोई सवाल है?

बस *हाँ सब ठीक है* या अपनी समस्या लिखकर भेजें।

आपातकालीन स्थिति में ${hospitalContact} पर कॉल करें या *HELP* लिखें।

आपकी सेहत हमारी प्राथमिकता है! 🙏`,

    english: `🏥 *${hospitalName} - Health Check*

Hello ${patientName},

How are you feeling after returning home?

Please tell us:
1️⃣ Have you taken your medicines? (Yes/No)
2️⃣ Any problems? (Fever, pain, breathing difficulty, etc.)
3️⃣ Any questions?

Just reply *Yes all good* or describe your concern.

In emergency, call ${hospitalContact} or reply *HELP*.

Your health is our priority! 🙏`,

    tamil: `🏥 *${hospitalName} - உடல்நல சோதனை*

வணக்கம் ${patientName},

வீட்டிற்கு திரும்பிய பின் நீங்கள் எப்படி உணர்கிறீர்கள்?

தயவுசெய்து சொல்லுங்கள்:
1️⃣ உங்கள் மருந்துகளை எடுத்தீர்களா? (ஆம்/இல்லை)
2️⃣ ஏதேனும் பிரச்சனைகள்?
3️⃣ ஏதேனும் கேள்விகள்?

*ஆம் எல்லாம் நன்றாக* என்று பதிலளிக்கவும் அல்லது உங்கள் கவலையை விவரிக்கவும்.

அவசரநிலையில் ${hospitalContact} ஐ அழைக்கவும் அல்லது *HELP* என்று பதிலளிக்கவும்.

உங்கள் ஆரோக்கியம் எங்கள் முன்னுரிமை! 🙏`,

    telugu: `🏥 *${hospitalName} - ఆరోగ్య తనిఖీ*

నమస్తే ${patientName},

ఇంటికి తిరిగి వచ్చిన తర్వాత మీకు ఎలా అనిపిస్తోంది?

దయచేసి చెప్పండి:
1️⃣ మీ మందులు తీసుకున్నారా? (అవును/కాదు)
2️⃣ ఏదైనా సమస్యలు?
3️⃣ ఏదైనా ప్రశ్నలు?

*అవును అంతా బాగుంది* అని రిప్లై చేయండి లేదా మీ సమస్యను వివరించండి.

అత్యవసర పరిస్థితిలో ${hospitalContact} కి కాల్ చేయండి లేదా *HELP* అని రిప్లై చేయండి.

మీ ఆరోగ్యమే మా ప్రాధాన్యత! 🙏`,

    marathi: `🏥 *${hospitalName} - आरोग्य तपासणी*

नमस्कार ${patientName},

घरी परतल्यानंतर तुम्हाला कसे वाटत आहे?

कृपया सांगा:
1️⃣ तुम्ही तुमची औषधे घेतली का? (हो/नाही)
2️⃣ काही त्रास?
3️⃣ काही प्रश्न आहेत?

फक्त *हो सर्व ठीक आहे* असे लिहा किंवा तुमची समस्या सांगा.

आणीबाणीत ${hospitalContact} वर कॉल करा किंवा *HELP* लिहा.

तुमचे आरोग्य आमची प्राधान्य आहे! 🙏`,
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
    const bolnaApiKey = Deno.env.get("BOLNA_API_KEY");
    const bolnaAgentId = Deno.env.get("BOLNA_AGENT_ID");
    const bolnaAgentIdHindi = Deno.env.get("BOLNA_AGENT_ID_HINDI");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Find patients who need 48hr check
    const { data: patients, error: patientsError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          id,
          name,
          hospital_contact_number,
          auto_48hr_check,
          sms_used_this_month,
          calls_used_this_month,
          voice_enabled,
          bolna_agent_id,
          bolna_agent_id_hindi
        )
      `)
      .lte("check_48hr_scheduled_at", now.toISOString())
      .eq("check_48hr_completed", false)
      .eq("status", "active")
      .lt("check_48hr_attempt_count", 3);

    if (patientsError) {
      console.error("Error fetching patients:", patientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch patients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { patientId: string; patientName: string; method?: string; success?: boolean; error?: string }[] = [];
    let processed = 0;

    for (const patient of patients || []) {
      // Skip if organization has auto 48hr check disabled
      if (!patient.organizations?.auto_48hr_check) {
        continue;
      }

      processed++;
      const attemptCount = (patient.check_48hr_attempt_count || 0) + 1;
      const language = patient.language || "hindi";
      const hospitalName = patient.organizations?.name || "Hospital";
      const hospitalContact = patient.organizations?.hospital_contact_number || "hospital helpline";

      // Update attempt count
      await supabase
        .from("discharged_patients")
        .update({ check_48hr_attempt_count: attemptCount })
        .eq("id", patient.id);

      // Try voice call first if Bolna is configured, voice is enabled, and language is supported
      let voiceSuccess = false;
      const orgVoiceEnabled = patient.organizations?.voice_enabled !== false;
      const orgAgentId = patient.organizations?.bolna_agent_id;
      const orgAgentIdHindi = patient.organizations?.bolna_agent_id_hindi;
      
      // Use org-specific agent IDs if available, otherwise fall back to global
      const effectiveAgentId = language === "hindi" 
        ? (orgAgentIdHindi || orgAgentId || bolnaAgentIdHindi || bolnaAgentId)
        : (orgAgentId || bolnaAgentId);
      
      if (bolnaApiKey && orgVoiceEnabled && effectiveAgentId) {
        try {
          if (effectiveAgentId) {
            // Format phone for Bolna
            let phoneNumber = patient.mobile_number.replace(/\D/g, "");
            if (phoneNumber.length === 10) {
              phoneNumber = `+91${phoneNumber}`;
            } else if (!phoneNumber.startsWith("+")) {
              phoneNumber = `+${phoneNumber}`;
            }

            // Build context for the call
            const medicines = (patient.medicine_list || [])
              .map((m: any) => m.name)
              .join(", ");
            const symptoms = (patient.red_flag_symptoms || []).join(", ");

            // Calculate days since discharge and call type
            const daysSinceDischarge = Math.floor(
              (now.getTime() - new Date(patient.discharge_date).getTime()) / (24 * 60 * 60 * 1000)
            );
            let callType = "day_1";
            if (daysSinceDischarge >= 7) callType = "day_7";
            else if (daysSinceDischarge >= 3) callType = "day_3";
            
            // Build greeting based on language and call type
            const greeting = language === "hindi"
              ? `नमस्ते ${patient.patient_name} जी, मैं ${hospitalName} से बोल रहा हूं।`
              : `Hello ${patient.patient_name}, I'm calling from ${hospitalName}.`;

            const bolnaResponse = await fetch("https://api.bolna.dev/call", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${bolnaApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                agent_id: effectiveAgentId,
                recipient_phone_number: phoneNumber,
                user_data: {
                  patient_name: patient.patient_name,
                  hospital_name: hospitalName,
                  greeting: greeting,
                  medicines: medicines || "prescribed medicines",
                  red_flag_symptoms: symptoms || "fever, severe pain, breathing difficulty",
                  days_since_discharge: daysSinceDischarge,
                  discharge_date: patient.discharge_date,
                  diagnosis: patient.diagnosis || "recent procedure",
                  doctor_name: patient.doctor_name || "your doctor",
                  follow_up_date: patient.follow_up_date || "",
                  language: language,
                  call_type: callType,
                  hospital_contact: hospitalContact,
                },
              }),
            });

            if (bolnaResponse.ok) {
              const bolnaResult = await bolnaResponse.json();
              voiceSuccess = true;

              // Log the attempt
              await supabase.from("patient_checkins").insert({
                patient_id: patient.id,
                organization_id: patient.organization_id,
                checkin_type: "discharge_48hr",
                method: "voice",
                call_id: bolnaResult.call_id || bolnaResult.execution_id,
                answered: false,
              });

              await supabase.from("patient_communications").insert({
                patient_id: patient.id,
                organization_id: patient.organization_id,
                direction: "outbound",
                channel: "voice",
                content: `48hr health check call initiated (${language})`,
                status: "initiated",
              });

              // Update check method
              await supabase
                .from("discharged_patients")
                .update({ check_48hr_method: "voice" })
                .eq("id", patient.id);

              // Increment call usage
              await supabase
                .from("organizations")
                .update({
                  calls_used_this_month: (patient.organizations?.calls_used_this_month || 0) + 1,
                })
                .eq("id", patient.organization_id);

              results.push({
                patientId: patient.id,
                patientName: patient.patient_name,
                method: "voice",
                success: true,
              });

              continue; // Skip WhatsApp if voice succeeded
            }
          }
        } catch (error: any) {
          console.error("Voice call error:", error);
          // Fall through to WhatsApp
        }
      }

      // Fallback to WhatsApp
      try {
        const message = get48hrTemplate(language, patient.patient_name, hospitalName, hospitalContact);

        // Format phone for WhatsApp
        let phoneNumber = patient.mobile_number.replace(/\D/g, "");
        if (phoneNumber.length === 10) {
          phoneNumber = `+91${phoneNumber}`;
        } else if (!phoneNumber.startsWith("+")) {
          phoneNumber = `+${phoneNumber}`;
        }

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
          // Log the attempt
          await supabase.from("patient_checkins").insert({
            patient_id: patient.id,
            organization_id: patient.organization_id,
            checkin_type: "discharge_48hr",
            method: "whatsapp",
            message_sid: twilioResult.sid,
            answered: false,
          });

          await supabase.from("patient_communications").insert({
            patient_id: patient.id,
            organization_id: patient.organization_id,
            direction: "outbound",
            channel: "whatsapp",
            content: message,
            message_sid: twilioResult.sid,
            status: "sent",
          });

          // Update check method
          await supabase
            .from("discharged_patients")
            .update({ check_48hr_method: "whatsapp" })
            .eq("id", patient.id);

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
            method: "whatsapp",
            success: true,
          });
        } else {
          results.push({
            patientId: patient.id,
            patientName: patient.patient_name,
            method: "whatsapp",
            error: twilioResult.message || "Twilio error",
          });
        }
      } catch (error: any) {
        results.push({
          patientId: patient.id,
          patientName: patient.patient_name,
          error: error.message,
        });
      }
    }

    console.log(`48hr checks processed: ${processed}, results:`, results.length);

    return new Response(
      JSON.stringify({ processed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("48hr check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
