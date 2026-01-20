import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find subscriptions expiring in 3 days (haven't received 3-day reminder)
    const { data: threeDayUsers, error: threeDayError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, subscription_tier, subscription_expires_at, auto_renewal_enabled")
      .eq("subscription_status", "active")
      .not("subscription_expires_at", "is", null)
      .gte("subscription_expires_at", now.toISOString())
      .lte("subscription_expires_at", threeDaysFromNow.toISOString());

    if (threeDayError) {
      console.error("Error fetching 3-day users:", threeDayError);
    }

    // Find subscriptions expiring in 1 day (haven't received 1-day reminder)
    const { data: oneDayUsers, error: oneDayError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, subscription_tier, subscription_expires_at, auto_renewal_enabled")
      .eq("subscription_status", "active")
      .not("subscription_expires_at", "is", null)
      .gte("subscription_expires_at", now.toISOString())
      .lte("subscription_expires_at", oneDayFromNow.toISOString());

    if (oneDayError) {
      console.error("Error fetching 1-day users:", oneDayError);
    }

    const results = [];

    // Process 3-day reminders
    for (const profile of threeDayUsers || []) {
      // Check if reminder already sent
      const { data: existingReminder } = await supabase
        .from("renewal_reminders")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("reminder_type", "3_days")
        .eq("subscription_expires_at", profile.subscription_expires_at)
        .single();

      if (existingReminder) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      const userEmail = userData?.user?.email;

      if (!userEmail) continue;

      const expiryDate = new Date(profile.subscription_expires_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const planName = profile.subscription_tier === "premium" ? "Premium" : "Basic";
      const planPrice = profile.subscription_tier === "premium" ? "₹699" : "₹299";

      // Send email
      if (resend) {
        try {
          await resend.emails.send({
            from: "Sentio <noreply@sentio.in.net>",
            to: [userEmail],
            subject: `Your Sentio ${planName} subscription expires in 3 days`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0f766e;">Hi ${profile.full_name?.split(" ")[0] || "there"},</h1>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  Your Sentio <strong>${planName}</strong> subscription will expire on <strong>${expiryDate}</strong>.
                </p>

                ${profile.auto_renewal_enabled ? `
                  <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #047857;">
                      ✓ <strong>Auto-renewal is enabled</strong><br>
                      Your subscription will automatically renew for ${planPrice}/month. No action needed!
                    </p>
                  </div>
                ` : `
                  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                      ⚠️ <strong>Auto-renewal is disabled</strong><br>
                      Please renew manually to continue caring for your loved ones.
                    </p>
                  </div>
                `}

                <p style="font-size: 14px; color: #6b7280;">
                  If you have any questions, reply to this email or contact us at info@sentio.in.net
                </p>

                <p style="font-size: 14px; color: #6b7280;">
                  With care,<br>
                  Team Sentio
                </p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
        }
      }

      // Record reminder
      await supabase.from("renewal_reminders").insert({
        user_id: profile.user_id,
        reminder_type: "3_days",
        subscription_expires_at: profile.subscription_expires_at,
        email_sent: !!resend,
      });

      results.push({ user_id: profile.user_id, type: "3_days" });
    }

    // Process 1-day reminders
    for (const profile of oneDayUsers || []) {
      // Check if reminder already sent
      const { data: existingReminder } = await supabase
        .from("renewal_reminders")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("reminder_type", "1_day")
        .eq("subscription_expires_at", profile.subscription_expires_at)
        .single();

      if (existingReminder) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      const userEmail = userData?.user?.email;

      if (!userEmail) continue;

      const planName = profile.subscription_tier === "premium" ? "Premium" : "Basic";
      const planPrice = profile.subscription_tier === "premium" ? "₹699" : "₹299";

      // Send email
      if (resend) {
        try {
          await resend.emails.send({
            from: "Sentio <noreply@sentio.in.net>",
            to: [userEmail],
            subject: `⚠️ Your Sentio subscription expires TOMORROW`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #dc2626;">Hi ${profile.full_name?.split(" ")[0] || "there"},</h1>
                
                <p style="font-size: 18px; line-height: 1.6; color: #dc2626;">
                  <strong>Your Sentio ${planName} subscription expires tomorrow!</strong>
                </p>

                ${profile.auto_renewal_enabled ? `
                  <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #047857;">
                      ✓ <strong>Don't worry!</strong><br>
                      Auto-renewal is enabled. We'll renew your subscription for ${planPrice}/month automatically.
                    </p>
                  </div>
                ` : `
                  <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #dc2626;">
                      ⚠️ <strong>Action Required!</strong><br>
                      Auto-renewal is disabled. Please renew your subscription today to continue protecting your loved ones.
                    </p>
                  </div>
                  <a href="https://sentiocare.lovable.app/profile" style="display: inline-block; background: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
                    Renew Now
                  </a>
                `}

                <p style="font-size: 14px; color: #6b7280;">
                  With care,<br>
                  Team Sentio
                </p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
        }
      }

      // Record reminder
      await supabase.from("renewal_reminders").insert({
        user_id: profile.user_id,
        reminder_type: "1_day",
        subscription_expires_at: profile.subscription_expires_at,
        email_sent: !!resend,
      });

      results.push({ user_id: profile.user_id, type: "1_day" });
    }

    console.log(`Sent ${results.length} renewal reminders`);

    return new Response(
      JSON.stringify({ sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending reminders:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
