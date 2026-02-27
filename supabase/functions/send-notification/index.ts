import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  elder_id: string;
  type: "alert" | "low_wellbeing" | "missed_checkin" | "summary";
  data: {
    title?: string;
    severity?: string;
    description?: string;
    wellbeing_score?: number;
    check_in_summary?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { elder_id, type, data }: NotificationRequest = await req.json();
    console.log(`Processing notification for elder: ${elder_id}, type: ${type}`);

    // Get elder info and notification settings
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select(`
        *,
        notification_settings(*),
        profiles!elders_family_member_id_fkey(full_name, phone_number)
      `)
      .eq("id", elder_id)
      .single();

    if (elderError || !elder) {
      console.error("Elder not found:", elderError);
      throw new Error("Elder not found");
    }

    const settings = elder.notification_settings?.[0];
    if (!settings) {
      console.log("No notification settings configured for this elder");
      return new Response(JSON.stringify({ message: "No notification settings" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we should send based on type and settings
    let shouldSend = false;
    if (type === "alert" && settings.notify_on_alert) shouldSend = true;
    if (type === "low_wellbeing" && settings.notify_on_low_wellbeing) shouldSend = true;
    if (type === "missed_checkin" && settings.notify_on_missed_checkin) shouldSend = true;
    if (type === "summary") shouldSend = true;

    if (!shouldSend || !settings.notify_email || !settings.email_address) {
      console.log("Notification not enabled for this type or no email configured");
      return new Response(JSON.stringify({ message: "Notification not enabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content based on type
    let subject = "";
    let htmlContent = "";
    const elderName = elder.full_name;

    switch (type) {
      case "alert":
        subject = `🚨 Alert for ${elderName}: ${data.title}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${data.severity === 'high' ? '#dc2626' : data.severity === 'medium' ? '#f59e0b' : '#3b82f6'};">
              Health Alert for ${elderName}
            </h1>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
              <h2 style="margin: 0 0 8px 0;">${data.title}</h2>
              <p style="margin: 0; color: #666;">${data.description}</p>
            </div>
            <p>Please check in with ${elderName} as soon as possible.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">This notification was sent by Sentio AI Health Monitoring</p>
          </div>
        `;
        break;

      case "low_wellbeing":
        subject = `⚠️ Low Well-being Score for ${elderName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Well-being Alert for ${elderName}</h1>
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
              <h2 style="margin: 0 0 8px 0;">Well-being Score: ${data.wellbeing_score}/10</h2>
              <p style="margin: 0; color: #666;">This is below the threshold you set (${settings.wellbeing_threshold}/10)</p>
            </div>
            ${data.check_in_summary ? `<p><strong>Check-in Summary:</strong> ${data.check_in_summary}</p>` : ''}
            <p>Consider reaching out to ${elderName} to check how they're doing.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">This notification was sent by Sentio AI Health Monitoring</p>
          </div>
        `;
        break;

      case "missed_checkin":
        subject = `📞 Missed Check-in for ${elderName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6b7280;">Missed Check-in Alert</h1>
            <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 16px 0;">
              <p style="margin: 0;">${elderName} did not complete their scheduled check-in today.</p>
            </div>
            <p>This could mean they were unavailable or there was a technical issue. You may want to give them a call.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">This notification was sent by Sentio AI Health Monitoring</p>
          </div>
        `;
        break;

      default:
        subject = `Sentio AI Update for ${elderName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Update for ${elderName}</h1>
            <p>${data.description || 'No additional details'}</p>
          </div>
        `;
    }

    // Send email using Resend API directly
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    if (!Deno.env.get("RESEND_FROM_EMAIL")) {
      console.warn("⚠️ RESEND_FROM_EMAIL not set - using onboarding@resend.dev which only works for the Resend account owner's email. Set RESEND_FROM_EMAIL to a verified domain sender for production.");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Sentio AI <${fromEmail}>`,
        to: [settings.email_address],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email send error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailId: emailResult?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
