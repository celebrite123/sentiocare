import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EscalationRequest {
  organization_id: string;
  patient_id: string;
  alert_id?: string;
  severity: "red" | "yellow" | "green";
  reason: string;
  safety_responses?: Record<string, string>;
  triggered_symptoms?: string[];
}

const escalationConfig = {
  red: {
    channels: ["sms", "whatsapp"],
    targets: ["on_call_clinician", "duty_nurse"],
    sla_minutes: 15,
    template_hindi: "🚨 URGENT: {patient_name} ({ward}) ने {symptom} रिपोर्ट किया। तुरंत callback करें। {hospital_contact}",
    template_english: "🚨 URGENT: {patient_name} ({ward}) reported {symptom}. Immediate callback required. {hospital_contact}",
  },
  yellow: {
    channels: ["sms", "email"],
    targets: ["duty_nurse"],
    sla_minutes: 120,
    template_hindi: "⚠️ Follow-up ज़रूरी: {patient_name} - {reason}",
    template_english: "⚠️ Follow-up needed: {patient_name} - {reason}",
  },
  green: {
    channels: ["email"],
    targets: ["care_coordinator"],
    sla_minutes: 480,
    template_hindi: "ℹ️ Advisory: {patient_name} - {reason}",
    template_english: "ℹ️ Advisory: {patient_name} - {reason}",
  },
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
    const body: EscalationRequest = await req.json();
    const { organization_id, patient_id, alert_id, severity, reason, safety_responses, triggered_symptoms } = body;

    console.log(`Escalating ${severity} alert for patient ${patient_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get patient and organization details
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select("*, organizations(*)")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found: ${patient_id}`);
    }

    const org = patient.organizations;
    const config = escalationConfig[severity];
    const slaDeadline = new Date(Date.now() + config.sla_minutes * 60 * 1000);

    // Build notification message
    const symptomText = triggered_symptoms?.join(", ") || reason;
    const template = patient.language === "english" ? config.template_english : config.template_hindi;
    const message = template
      .replace("{patient_name}", patient.patient_name)
      .replace("{ward}", patient.ward || "N/A")
      .replace("{symptom}", symptomText)
      .replace("{reason}", reason)
      .replace("{hospital_contact}", org?.hospital_contact_number || "hospital");

    const notificationResults: string[] = [];

    // Get target phone numbers/emails based on severity
    const getTargetContacts = () => {
      const contacts: { phone?: string; email?: string; role: string }[] = [];
      
      for (const target of config.targets) {
        switch (target) {
          case "on_call_clinician":
            if (org?.on_call_clinician_phone) {
              contacts.push({ phone: org.on_call_clinician_phone, role: "clinician" });
            }
            break;
          case "duty_nurse":
            if (org?.duty_nurse_phone) {
              contacts.push({ phone: org.duty_nurse_phone, role: "nurse" });
            }
            if (org?.escalation_email && config.channels.includes("email")) {
              contacts.push({ email: org.escalation_email, role: "nurse" });
            }
            break;
          case "care_coordinator":
            if (org?.care_coordinator_email) {
              contacts.push({ email: org.care_coordinator_email, role: "coordinator" });
            }
            break;
        }
      }

      // Fallback to escalation contacts if specific ones not set
      if (contacts.length === 0) {
        if (org?.escalation_phone && (config.channels.includes("sms") || config.channels.includes("whatsapp"))) {
          contacts.push({ phone: org.escalation_phone, role: "escalation" });
        }
        if (org?.escalation_email && config.channels.includes("email")) {
          contacts.push({ email: org.escalation_email, role: "escalation" });
        }
      }

      return contacts;
    };

    const contacts = getTargetContacts();

    // Send SMS notifications
    if (config.channels.includes("sms")) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_WHATSAPP_NUMBER")?.replace("whatsapp:", "");

      if (twilioAccountSid && twilioAuthToken && twilioPhone) {
        for (const contact of contacts.filter(c => c.phone)) {
          try {
            const formData = new URLSearchParams();
            formData.append("To", contact.phone!);
            formData.append("From", twilioPhone);
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
              notificationResults.push(`SMS sent to ${contact.role}`);
              console.log(`SMS sent to ${contact.role}: ${contact.phone}`);
            } else {
              const error = await response.text();
              console.error(`SMS failed to ${contact.role}:`, error);
            }
          } catch (e) {
            console.error(`SMS error to ${contact.role}:`, e);
          }
        }
      }
    }

    // Send WhatsApp notifications (for RED alerts)
    if (config.channels.includes("whatsapp")) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioWhatsApp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

      if (twilioAccountSid && twilioAuthToken && twilioWhatsApp) {
        for (const contact of contacts.filter(c => c.phone)) {
          try {
            const formData = new URLSearchParams();
            formData.append("To", `whatsapp:${contact.phone}`);
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
              notificationResults.push(`WhatsApp sent to ${contact.role}`);
              console.log(`WhatsApp sent to ${contact.role}: ${contact.phone}`);
            } else {
              const error = await response.text();
              console.error(`WhatsApp failed to ${contact.role}:`, error);
            }
          } catch (e) {
            console.error(`WhatsApp error to ${contact.role}:`, e);
          }
        }
      }
    }

    // Send Email notifications
    if (config.channels.includes("email")) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (resendApiKey) {
        for (const contact of contacts.filter(c => c.email)) {
          try {
            const emailSubject = severity === "red" 
              ? `🚨 URGENT: Patient ${patient.patient_name} requires immediate attention`
              : severity === "yellow"
              ? `⚠️ Follow-up needed: ${patient.patient_name}`
              : `ℹ️ Advisory: ${patient.patient_name}`;

            const emailBody = `
              <h2>${emailSubject}</h2>
              <p><strong>Patient:</strong> ${patient.patient_name}</p>
              <p><strong>Ward:</strong> ${patient.ward || "N/A"}</p>
              <p><strong>Diagnosis:</strong> ${patient.diagnosis || "N/A"}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              ${triggered_symptoms ? `<p><strong>Symptoms:</strong> ${triggered_symptoms.join(", ")}</p>` : ""}
              <p><strong>SLA Deadline:</strong> ${slaDeadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              <p><strong>Patient Phone:</strong> ${patient.mobile_number}</p>
              <hr>
              <p>Please take action within the SLA timeframe.</p>
            `;

            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Sentio Alerts <alerts@sentio.in.net>",
                to: [contact.email],
                subject: emailSubject,
                html: emailBody,
              }),
            });

            if (response.ok) {
              notificationResults.push(`Email sent to ${contact.role}`);
              console.log(`Email sent to ${contact.role}: ${contact.email}`);
            } else {
              const error = await response.text();
              console.error(`Email failed to ${contact.role}:`, error);
            }
          } catch (e) {
            console.error(`Email error to ${contact.role}:`, e);
          }
        }
      }
    }

    // Send WhatsApp to caregiver for RED alerts (if caregiver phone is registered)
    if (severity === "red" && patient.caregiver_phone) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioWhatsApp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

      if (twilioAccountSid && twilioAuthToken && twilioWhatsApp) {
        try {
          let caregiverPhone = patient.caregiver_phone.replace(/\D/g, "");
          if (caregiverPhone.length === 10) {
            caregiverPhone = "91" + caregiverPhone;
          }

          const caregiverName = patient.caregiver_name || "परिवार के सदस्य";
          const caregiverMessage = patient.language === "english"
            ? `🚨 URGENT Health Alert from ${org?.name || "Hospital"}\n\nDear ${caregiverName},\n\n${patient.patient_name} has reported concerning symptoms: ${symptomText}.\n\nPlease check on them immediately.\n\nHospital helpline: ${org?.hospital_contact_number || "hospital"}\n\nA hospital staff member will also call back within 15 minutes.`
            : `🚨 अर्जेंट: ${org?.name || "अस्पताल"} से स्वास्थ्य अलर्ट\n\nप्रिय ${caregiverName},\n\n${patient.patient_name} जी ने चिंताजनक लक्षण बताए हैं: ${symptomText}.\n\nकृपया तुरंत उनसे संपर्क करें।\n\nअस्पताल हेल्पलाइन: ${org?.hospital_contact_number || "अस्पताल"}\n\nअस्पताल का स्टाफ़ भी 15 मिनट में कॉल करेगा।`;

          const formData = new URLSearchParams();
          formData.append("To", `whatsapp:+${caregiverPhone}`);
          formData.append("From", twilioWhatsApp);
          formData.append("Body", caregiverMessage);

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
            notificationResults.push("WhatsApp sent to caregiver");
            console.log(`WhatsApp sent to caregiver: ${patient.caregiver_name} at ${caregiverPhone}`);
          } else {
            const error = await response.text();
            console.error(`WhatsApp failed to caregiver:`, error);
          }
        } catch (e) {
          console.error(`WhatsApp error to caregiver:`, e);
        }
      }
    }

    // Update alert with notification status
    if (alert_id) {
      await supabase
        .from("b2b_alerts")
        .update({
          notification_sent: notificationResults.length > 0,
          notification_sent_at: new Date().toISOString(),
          sla_deadline: slaDeadline.toISOString(),
        })
        .eq("id", alert_id);
    }

    // Schedule guaranteed callback for RED alerts
    if (severity === "red") {
      const { error: callbackError } = await supabase
        .from("scheduled_callbacks")
        .insert({
          organization_id,
          patient_id,
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
          reason: `RED ALERT: ${reason}`,
          status: "pending",
          sla_deadline: slaDeadline.toISOString(),
          patient_notified: false,
        });

      if (callbackError) {
        console.error("Failed to schedule callback:", callbackError);
      } else {
        console.log("Guaranteed callback scheduled for RED alert");
      }
    }

    console.log(`Escalation complete: ${notificationResults.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        severity,
        notifications_sent: notificationResults,
        sla_deadline: slaDeadline.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Escalation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
