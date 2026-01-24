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
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all organizations with active subscriptions
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("*");

    if (orgError) throw orgError;

    const results = [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const org of organizations || []) {
      try {
        // Get organization admins
        const { data: admins } = await supabase
          .from("organization_members")
          .select("email, name")
          .eq("organization_id", org.id)
          .eq("role", "admin")
          .not("email", "is", null);

        if (!admins || admins.length === 0) continue;

        // Gather weekly stats
        const { data: patients } = await supabase
          .from("discharged_patients")
          .select("id, risk_status, check_48hr_completed, medicine_day_count")
          .eq("organization_id", org.id)
          .gte("discharge_date", weekAgo.toISOString().split("T")[0]);

        const { data: communications } = await supabase
          .from("patient_communications")
          .select("id, channel")
          .eq("organization_id", org.id)
          .gte("created_at", weekAgo.toISOString());

        const { data: alerts } = await supabase
          .from("b2b_alerts")
          .select("id, resolved, severity")
          .eq("organization_id", org.id)
          .gte("created_at", weekAgo.toISOString());

        // Calculate stats
        const stats = {
          totalPatients: patients?.length || 0,
          patientsContacted48hr: patients?.filter(p => p.check_48hr_completed).length || 0,
          urgentCases: patients?.filter(p => p.risk_status === "urgent").length || 0,
          nurseFollowups: patients?.filter(p => p.risk_status === "nurse_followup").length || 0,
          stableCases: patients?.filter(p => p.risk_status === "stable").length || 0,
          totalMessages: communications?.filter(c => c.channel === "whatsapp").length || 0,
          totalCalls: communications?.filter(c => c.channel === "voice").length || 0,
          alertsGenerated: alerts?.length || 0,
          alertsResolved: alerts?.filter(a => a.resolved).length || 0,
          criticalAlerts: alerts?.filter(a => a.severity === "critical" || a.severity === "high").length || 0,
        };

        const contactRate = stats.totalPatients > 0 
          ? Math.round((stats.patientsContacted48hr / stats.totalPatients) * 100) 
          : 0;

        // Build email HTML
        const emailHtml = buildWeeklyReportEmail(org.name, stats, contactRate);

        // Send to each admin
        for (const admin of admins) {
          if (!admin.email) continue;

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Sentio B2B <reports@sentio.in.net>",
              to: admin.email,
              subject: `Weekly Report: ${org.name} - ${new Date().toLocaleDateString("en-IN")}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            results.push({
              organization: org.name,
              email: admin.email,
              success: true,
            });
          } else {
            const emailError = await emailResponse.text();
            results.push({
              organization: org.name,
              email: admin.email,
              success: false,
              error: emailError,
            });
          }
        }
      } catch (orgProcessError: unknown) {
        const errorMessage = orgProcessError instanceof Error ? orgProcessError.message : "Unknown error";
        console.error(`Error processing org ${org.id}:`, orgProcessError);
        results.push({
          organization: org.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating weekly reports:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildWeeklyReportEmail(
  hospitalName: string, 
  stats: {
    totalPatients: number;
    patientsContacted48hr: number;
    urgentCases: number;
    nurseFollowups: number;
    stableCases: number;
    totalMessages: number;
    totalCalls: number;
    alertsGenerated: number;
    alertsResolved: number;
    criticalAlerts: number;
  }, 
  contactRate: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1e3a5f; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .highlight { background: #e8f4f8; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Weekly Post-Discharge Report</h1>
    <p>${hospitalName}</p>
    <p style="font-size: 14px; opacity: 0.9;">${new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  
  <div class="content">
    <div class="${contactRate >= 80 ? 'success-box' : contactRate >= 60 ? 'highlight' : 'alert-box'}">
      <strong>48-Hour Contact Rate: ${contactRate}%</strong>
      <p style="margin: 5px 0 0 0; font-size: 14px;">
        ${contactRate >= 80 ? '✅ Excellent follow-up rate!' : contactRate >= 60 ? '⚠️ Good, but room for improvement' : '❌ Needs attention - many patients not contacted'}
      </p>
    </div>
    
    <h3>Patient Overview</h3>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalPatients}</div>
        <div class="stat-label">Total Discharged</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.patientsContacted48hr}</div>
        <div class="stat-label">Contacted (48hr)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${stats.urgentCases > 0 ? '#dc3545' : '#28a745'}">${stats.urgentCases}</div>
        <div class="stat-label">Urgent Cases</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #ffc107">${stats.nurseFollowups}</div>
        <div class="stat-label">Nurse Follow-ups</div>
      </div>
    </div>
    
    <h3>Communication Stats</h3>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalMessages}</div>
        <div class="stat-label">WhatsApp Messages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalCalls}</div>
        <div class="stat-label">Voice Calls</div>
      </div>
    </div>
    
    <h3>Alerts Summary</h3>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.alertsGenerated}</div>
        <div class="stat-label">Total Alerts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.alertsResolved}</div>
        <div class="stat-label">Resolved</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${stats.criticalAlerts > 0 ? '#dc3545' : '#28a745'}">${stats.criticalAlerts}</div>
        <div class="stat-label">Critical/High</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.stableCases}</div>
        <div class="stat-label">Stable Patients</div>
      </div>
    </div>
    
    <div class="highlight">
      <strong>💡 Tip:</strong> Log in to your dashboard for detailed patient-level insights and to manage pending alerts.
    </div>
  </div>
  
  <div class="footer">
    <p>Powered by Sentio AI Post-Discharge Care</p>
    <p>Questions? Contact support@sentio.in.net</p>
  </div>
</body>
</html>`;
}
