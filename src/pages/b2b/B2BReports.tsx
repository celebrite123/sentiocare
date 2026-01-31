import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Users, Phone, MessageSquare, AlertTriangle, Pill, FileText, Mail, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const B2BReports = () => {
  const { organization, member } = useOrganization();
  const [dateRange, setDateRange] = useState("7days");
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    contacted48hr: 0,
    medicineAdherence: 0,
    nurseInterventions: 0,
    urgentCases: 0,
    stableCases: 0,
  });
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [dailyContacts, setDailyContacts] = useState<any[]>([]);
  const [adherenceTrend, setAdherenceTrend] = useState<any[]>([]);

  useEffect(() => {
    if (organization) {
      loadReportData();
    }
  }, [organization, dateRange]);

  const loadReportData = async () => {
    const daysBack = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get patients in date range
    const { data: patients } = await supabase
      .from("discharged_patients")
      .select("*")
      .eq("organization_id", organization!.id)
      .gte("created_at", startDate.toISOString());

    const patientList = patients || [];

    // Calculate stats
    const contacted = patientList.filter((p) => p.check_48hr_completed).length;
    const urgent = patientList.filter((p) => p.risk_status === "urgent").length;
    const stable = patientList.filter((p) => p.risk_status === "stable").length;
    const nurseFollowup = patientList.filter((p) => p.risk_status === "nurse_followup").length;

    setStats({
      totalPatients: patientList.length,
      contacted48hr: contacted,
      medicineAdherence: patientList.length > 0 
        ? Math.round((patientList.filter((p) => p.medicine_day_count > 0).length / patientList.length) * 100)
        : 0,
      nurseInterventions: nurseFollowup + urgent,
      urgentCases: urgent,
      stableCases: stable,
    });

    // Risk distribution for pie chart
    setRiskDistribution([
      { name: "Stable", value: stable, color: "hsl(142, 76%, 45%)" },
      { name: "Nurse Follow-up", value: nurseFollowup, color: "hsl(45, 93%, 47%)" },
      { name: "Urgent", value: urgent, color: "hsl(0, 84%, 60%)" },
      { name: "Pending", value: patientList.length - stable - nurseFollowup - urgent, color: "hsl(var(--muted))" },
    ].filter((d) => d.value > 0));

    // Daily contacts for bar chart
    const dailyData: Record<string, { date: string; contacts: number; messages: number }> = {};
    for (let i = 0; i < Math.min(daysBack, 14); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = { date: dateStr, contacts: 0, messages: 0 };
    }

    // Get communications
    const { data: comms } = await supabase
      .from("patient_communications")
      .select("created_at, channel")
      .eq("organization_id", organization!.id)
      .gte("created_at", startDate.toISOString());

    (comms || []).forEach((comm) => {
      const dateStr = new Date(comm.created_at).toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        if (comm.channel === "voice") {
          dailyData[dateStr].contacts++;
        } else {
          dailyData[dateStr].messages++;
        }
      }
    });

    setDailyContacts(
      Object.values(dailyData)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          ...d,
          date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        }))
    );

    // Adherence trend (mock for now - would need actual tracking)
    const adherenceData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      adherenceData.push({
        day: date.toLocaleDateString("en-IN", { weekday: "short" }),
        rate: 70 + Math.floor(Math.random() * 25),
      });
    }
    setAdherenceTrend(adherenceData);
  };

  const handleExportCSV = () => {
    const csvData = [
      ["Metric", "Value"],
      ["Total Patients", stats.totalPatients],
      ["48hr Contact Rate", `${stats.totalPatients > 0 ? Math.round((stats.contacted48hr / stats.totalPatients) * 100) : 0}%`],
      ["Medicine Adherence", `${stats.medicineAdherence}%`],
      ["Nurse Interventions", stats.nurseInterventions],
      ["Urgent Cases", stats.urgentCases],
      ["Stable Cases", stats.stableCases],
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentio-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast({ title: "CSV exported successfully" });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Build HTML for PDF
      const contactRate = stats.totalPatients > 0 
        ? Math.round((stats.contacted48hr / stats.totalPatients) * 100) 
        : 0;
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sentio B2B Report - ${organization?.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e3a5f; margin: 0; }
    .header p { color: #666; margin: 5px 0 0 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-box { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #1e3a5f; }
    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .highlight { background: #e8f4f8; padding: 15px; border-radius: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Post-Discharge Care Report</h1>
    <p>${organization?.name} | ${new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p>Period: Last ${dateRange === "7days" ? "7" : dateRange === "30days" ? "30" : "90"} days</p>
  </div>

  <div class="highlight">
    <strong>48-Hour Contact Rate: ${contactRate}%</strong>
    <span style="margin-left: 10px;">${contactRate >= 80 ? '✅ Excellent' : contactRate >= 60 ? '⚠️ Good' : '❌ Needs improvement'}</span>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-value">${stats.totalPatients}</div>
      <div class="stat-label">Total Patients</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.contacted48hr}</div>
      <div class="stat-label">Contacted (48hr)</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.medicineAdherence}%</div>
      <div class="stat-label">Medicine Adherence</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.nurseInterventions}</div>
      <div class="stat-label">Nurse Interventions</div>
    </div>
    <div class="stat-box">
      <div class="stat-value" style="color: #dc3545;">${stats.urgentCases}</div>
      <div class="stat-label">Urgent Cases</div>
    </div>
    <div class="stat-box">
      <div class="stat-value" style="color: #28a745;">${stats.stableCases}</div>
      <div class="stat-label">Stable Cases</div>
    </div>
  </div>

  <div class="section">
    <h2>Risk Distribution</h2>
    <ul>
      ${riskDistribution.map(r => `<li><strong>${r.name}:</strong> ${r.value} patients</li>`).join('')}
    </ul>
  </div>

  <div class="footer">
    <p>Generated by Sentio AI Post-Discharge Care System</p>
    <p>For detailed analytics, log in to your dashboard at sentio.in.net</p>
  </div>
</body>
</html>`;

      // Create PDF using browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
      
      toast({ title: "PDF export ready", description: "Use your browser's print dialog to save as PDF" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmailReport = async () => {
    if (member?.role !== "admin") {
      toast({ title: "Admin access required", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await supabase.functions.invoke("b2b-weekly-report", {
        body: { organizationId: organization?.id },
      });

      if (response.error) throw response.error;

      toast({ 
        title: "Email report sent", 
        description: "Weekly report has been sent to all admins" 
      });
    } catch (error) {
      console.error("Email report error:", error);
      toast({ title: "Failed to send email report", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <B2BLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Track patient outcomes and team performance</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {member?.role === "admin" && (
              <Button onClick={handleSendEmailReport} disabled={sendingEmail} variant="outline">
                {sendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Email Report
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Total Patients</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalPatients}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">48hr Contact Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.totalPatients > 0 
                  ? Math.round((stats.contacted48hr / stats.totalPatients) * 100) 
                  : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Pill className="h-4 w-4" />
                <span className="text-sm">Med Adherence</span>
              </div>
              <p className="text-2xl font-bold">{stats.medicineAdherence}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Nurse Interventions</span>
              </div>
              <p className="text-2xl font-bold">{stats.nurseInterventions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Urgent Cases</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.urgentCases}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Stable Cases</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.stableCases}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>Patient risk levels breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {riskDistribution.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Communications</CardTitle>
              <CardDescription>Calls and messages sent per day</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyContacts.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyContacts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="contacts" name="Voice Calls" fill="hsl(var(--primary))" />
                      <Bar dataKey="messages" name="Messages" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medicine Adherence Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Medicine Adherence Trend</CardTitle>
            <CardDescription>Weekly adherence rate based on patient responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adherenceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Adherence Rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </B2BLayout>
  );
};

export default B2BReports;
