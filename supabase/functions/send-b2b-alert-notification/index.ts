import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertNotificationRequest {
  alertId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { alertId }: AlertNotificationRequest = await req.json();

    if (!alertId) {
      return new Response(
        JSON.stringify({ success: false, error: "Alert ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch alert with patient and organization details
    const { data: alert, error: alertError } = await supabase
      .from("b2b_alerts")
      .select(`
        *,
        discharged_patients (
          patient_name,
          mobile_number,
          diagnosis,
          ward
        ),
        organizations (
          name,
          escalation_phone,
          escalation_email,
          hospital_contact_number
        )
      `)
      .eq("id", alertId)
      .single();

    if (alertError || !alert) {
      console.error("Alert not found:", alertError);
      return new Response(
        JSON.stringify({ success: false, error: "Alert not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if notification already sent
    if (alert.notification_sent) {
      return new Response(
        JSON.stringify({ success: true, message: "Notification already sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patient = alert.discharged_patients;
    const org = alert.organizations;

    // Get escalation phone - fallback to hospital contact
    const escalationPhone = org?.escalation_phone || org?.hospital_contact_number;

    if (!escalationPhone) {
      console.log("No escalation phone configured for organization");
      return new Response(
        JSON.stringify({ success: false, error: "No escalation phone configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Twilio not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the alert message
    const severityEmoji = alert.severity === "critical" ? "🚨" : "⚠️";
    const message = `${severityEmoji} *${alert.severity.toUpperCase()} ALERT*

*Patient:* ${patient?.patient_name || "Unknown"}
*Phone:* ${patient?.mobile_number || "N/A"}
*Ward:* ${patient?.ward || "N/A"}

*Alert:* ${alert.title}
${alert.description ? `*Details:* ${alert.description}` : ""}

Please follow up immediately.

— ${org?.name || "SentioCare"}`;

    // Format phone number for WhatsApp
    let formattedPhone = escalationPhone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:+${formattedPhone}`);
    formData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send WhatsApp notification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update alert to mark notification as sent
    await supabase
      .from("b2b_alerts")
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    console.log(`Alert notification sent for alert ${alertId} to ${formattedPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent",
        messageSid: twilioResult.sid 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending alert notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
