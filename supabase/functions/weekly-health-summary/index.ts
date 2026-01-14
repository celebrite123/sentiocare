import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resend integration
class Resend {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(options: { from: string; to: string[]; subject: string; html: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }
    
    return response.json();
  }

  get emails() {
    return {
      send: this.sendEmail.bind(this),
    };
  }
}

interface CheckIn {
  id: string;
  created_at: string;
  well_being_score: number | null;
  medicines_taken: boolean | null;
  sentiment: string | null;
  alert_triggered: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log("Starting weekly health summary generation...");

    // Get all elders with weekly summary enabled
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select(`
        elder_id,
        weekly_summary_enabled,
        email_address,
        caregiver_name
      `)
      .eq("weekly_summary_enabled", true)
      .not("email_address", "is", null);

    if (settingsError) throw settingsError;

    console.log(`Found ${notificationSettings?.length || 0} elders with weekly summary enabled`);

    const emailsSent: string[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const settings of notificationSettings || []) {
      try {
        // Get elder info
        const { data: elder, error: elderError } = await supabase
          .from("elders")
          .select("id, full_name, family_member_id")
          .eq("id", settings.elder_id)
          .single();

        if (elderError || !elder) {
          console.log(`Elder not found for settings: ${settings.elder_id}`);
          continue;
        }

        // Get check-ins for the past 7 days
        const { data: checkIns, error: checkInError } = await supabase
          .from("check_ins")
          .select("id, created_at, well_being_score, medicines_taken, sentiment, alert_triggered")
          .eq("elder_id", elder.id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false });

        if (checkInError) throw checkInError;

        // Calculate statistics
        const totalCheckIns = checkIns?.length || 0;
        const medicinesTaken = checkIns?.filter((c: CheckIn) => c.medicines_taken === true).length || 0;
        const medicinesMissed = checkIns?.filter((c: CheckIn) => c.medicines_taken === false).length || 0;
        const medicineAdherence = totalCheckIns > 0 
          ? Math.round((medicinesTaken / (medicinesTaken + medicinesMissed || 1)) * 100) 
          : 0;

        const wellbeingScores = checkIns
          ?.filter((c: CheckIn) => c.well_being_score !== null)
          .map((c: CheckIn) => c.well_being_score as number) || [];
        const avgWellbeing = wellbeingScores.length > 0
          ? Math.round((wellbeingScores.reduce((a, b) => a + b, 0) / wellbeingScores.length) * 10) / 10
          : null;

        const sentimentCounts = {
          positive: checkIns?.filter((c: CheckIn) => c.sentiment === "positive").length || 0,
          neutral: checkIns?.filter((c: CheckIn) => c.sentiment === "neutral").length || 0,
          negative: checkIns?.filter((c: CheckIn) => c.sentiment === "negative").length || 0,
        };

        const alertsTriggered = checkIns?.filter((c: CheckIn) => c.alert_triggered).length || 0;

        // Generate email content
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
    .sentiment-bar { display: flex; border-radius: 4px; overflow: hidden; height: 24px; }
    .sentiment-positive { background: #22c55e; }
    .sentiment-neutral { background: #f59e0b; }
    .sentiment-negative { background: #ef4444; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    .alert-badge { background: #fef2f2; color: #dc2626; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
    .success-badge { background: #f0fdf4; color: #16a34a; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Health Summary</h1>
      <p>${elder.full_name}</p>
    </div>
    <div class="content">
      <p>Hi ${settings.caregiver_name || "Caregiver"},</p>
      <p>Here's ${elder.full_name}'s health summary for the past week:</p>
      
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${totalCheckIns}</div>
          <div class="stat-label">Check-ins Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgWellbeing !== null ? avgWellbeing : "N/A"}</div>
          <div class="stat-label">Avg Wellbeing Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${medicineAdherence}%</div>
          <div class="stat-label">Medicine Adherence</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            ${alertsTriggered > 0 
              ? `<span class="alert-badge">${alertsTriggered} alerts</span>` 
              : `<span class="success-badge">No alerts</span>`}
          </div>
          <div class="stat-label">Alerts This Week</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Mood Distribution</div>
        ${totalCheckIns > 0 ? `
        <div class="sentiment-bar">
          <div class="sentiment-positive" style="width: ${(sentimentCounts.positive / totalCheckIns) * 100}%"></div>
          <div class="sentiment-neutral" style="width: ${(sentimentCounts.neutral / totalCheckIns) * 100}%"></div>
          <div class="sentiment-negative" style="width: ${(sentimentCounts.negative / totalCheckIns) * 100}%"></div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
          🟢 Positive: ${sentimentCounts.positive} | 🟡 Neutral: ${sentimentCounts.neutral} | 🔴 Negative: ${sentimentCounts.negative}
        </p>
        ` : '<p style="color: #64748b;">No mood data available</p>'}
      </div>

      <div class="section">
        <div class="section-title">Medicine Tracking</div>
        <p>✅ Taken: ${medicinesTaken} times</p>
        <p>❌ Missed: ${medicinesMissed} times</p>
      </div>

      <p style="margin-top: 20px;">
        <a href="${Deno.env.get("SITE_URL") || "https://sentio.lovable.app"}/dashboard/${elder.id}" 
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          View Full Dashboard
        </a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated weekly summary from Sentio.</p>
      <p>You're receiving this because weekly summaries are enabled for ${elder.full_name}.</p>
    </div>
  </div>
</body>
</html>
        `;

        // Send email
        const emailResponse = await resend.emails.send({
          from: "Sentio <notifications@resend.dev>",
          to: [settings.email_address!],
          subject: `Weekly Health Summary for ${elder.full_name}`,
          html: emailHtml,
        });

        console.log(`Weekly summary email sent for elder ${settings.elder_id}`);
        emailsSent.push(settings.email_address!);
      } catch (elderError) {
        console.error(`Error processing elder ${settings.elder_id}:`, elderError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weekly summaries sent to ${emailsSent.length} caregivers`,
        emails: emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in weekly-health-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
