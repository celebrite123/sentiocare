import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  elderId: string;
  alertType: "emergency" | "health" | "missed_medication" | "low_wellbeing";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  initiateCall?: boolean; // If true, call the caregiver for emergencies
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { elderId, alertType, severity, title, description, initiateCall } = await req.json() as NotifyRequest;
    
    console.log("Notify caregiver request:", { elderId, alertType, severity, title, initiateCall });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get elder and notification settings
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select(`
        id, full_name, phone_number, preferred_language,
        notification_settings(caregiver_name, caregiver_phone, caregiver_relation, email_address, notify_email)
      `)
      .eq("id", elderId)
      .single();

    if (elderError || !elder) {
      console.error("Elder not found:", elderError);
      return new Response(JSON.stringify({ error: "Elder not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = elder.notification_settings?.[0];
    if (!settings) {
      console.log("No notification settings for elder:", elderId);
      return new Response(JSON.stringify({ message: "No notification settings" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = {
      email: false,
      sms: false,
      call: false,
    };

    // 1. Send Email Notification
    if (settings.notify_email && settings.email_address) {
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const severityColors: Record<string, string> = {
            low: "#3b82f6",
            medium: "#f59e0b",
            high: "#dc2626",
            critical: "#7f1d1d",
          };

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Sentio AI <onboarding@resend.dev>",
              to: [settings.email_address],
              subject: `🚨 ${severity === "critical" ? "URGENT" : "Alert"}: ${title} - ${elder.full_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">⚠️ Health Alert for ${elder.full_name}</h1>
                  </div>
                  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: ${severityColors[severity]}; margin-top: 0;">${title}</h2>
                    <p style="color: #374151; line-height: 1.6;">${description}</p>
                    <div style="background: white; border-left: 4px solid ${severityColors[severity]}; padding: 16px; margin: 16px 0;">
                      <p style="margin: 0;"><strong>Severity:</strong> ${severity.toUpperCase()}</p>
                      <p style="margin: 8px 0 0;"><strong>Alert Type:</strong> ${alertType}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                      ${severity === "critical" || severity === "high" 
                        ? "Please check on " + elder.full_name + " immediately or call them to ensure they are safe."
                        : "Please check in with " + elder.full_name + " when you have a moment."}
                    </p>
                  </div>
                  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
                    Sentio AI Health Monitoring System
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.email = true;
            console.log("Email sent successfully to caregiver");
          } else {
            console.error("Email send failed:", await emailResponse.text());
          }
        }
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // 2. Send SMS via Twilio (for high/critical alerts)
    if (settings.caregiver_phone && (severity === "high" || severity === "critical")) {
      try {
        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER) {
          // Send WhatsApp message to caregiver
          const caregiverPhone = settings.caregiver_phone.startsWith("+") 
            ? settings.caregiver_phone 
            : `+91${settings.caregiver_phone.replace(/^0+/, "")}`;

          const isHindi = elder.preferred_language === "hindi";
          const message = isHindi
            ? `🚨 Sentio अलर्ट: ${elder.full_name} के लिए ${severity === "critical" ? "आपातकालीन" : "महत्वपूर्ण"} अलर्ट!\n\n${title}\n${description}\n\nकृपया तुरंत संपर्क करें।`
            : `🚨 Sentio Alert: ${severity === "critical" ? "EMERGENCY" : "Important"} alert for ${elder.full_name}!\n\n${title}\n${description}\n\nPlease check on them immediately.`;

          const smsResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
                To: `whatsapp:${caregiverPhone}`,
                Body: message,
              }),
            }
          );

          if (smsResponse.ok) {
            results.sms = true;
            console.log("WhatsApp sent to caregiver");
          } else {
            console.error("WhatsApp send failed:", await smsResponse.text());
          }
        }
      } catch (smsError) {
        console.error("SMS error:", smsError);
      }
    }

    // 3. Emergency Call to Caregiver (only for critical emergencies)
    if (initiateCall && severity === "critical" && settings.caregiver_phone) {
      try {
        const BOLNA_API_KEY = Deno.env.get("BOLNA_API_KEY");
        const BOLNA_AGENT_ID = Deno.env.get("BOLNA_AGENT_ID");

        if (BOLNA_API_KEY && BOLNA_AGENT_ID) {
          const caregiverPhone = settings.caregiver_phone.startsWith("+") 
            ? settings.caregiver_phone 
            : `+91${settings.caregiver_phone.replace(/^0+/, "")}`;

          const isHindi = elder.preferred_language === "hindi";

          const userData = {
            elder_name: elder.full_name,
            caregiver_name: settings.caregiver_name || "Caregiver",
            alert_title: title,
            alert_description: description,
            is_emergency_notification: true,
            greeting: isHindi
              ? `नमस्ते ${settings.caregiver_name || ""}, मैं Sentio AI हूं। ${elder.full_name} के लिए एक आपातकालीन अलर्ट है। ${title}। कृपया उनसे तुरंत संपर्क करें।`
              : `Hello ${settings.caregiver_name || ""}, this is Sentio AI calling with an emergency alert about ${elder.full_name}. ${title}. Please check on them immediately.`,
          };

          const callResponse = await fetch("https://api.bolna.ai/call", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${BOLNA_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              agent_id: BOLNA_AGENT_ID,
              recipient_phone_number: caregiverPhone,
              user_data: userData,
            }),
          });

          if (callResponse.ok) {
            results.call = true;
            console.log("Emergency call initiated to caregiver");
          } else {
            console.error("Call failed:", await callResponse.text());
          }
        }
      } catch (callError) {
        console.error("Call error:", callError);
      }
    }

    console.log("Notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify caregiver error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
