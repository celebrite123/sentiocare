import { useEffect, useState } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { StatsCards } from "@/components/b2b/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, AlertTriangle, Users, Download, PhoneCall, BarChart3 } from "lucide-react";
import { RiskBadge } from "@/components/b2b/RiskBadge";
import { PendingCallbacks } from "@/components/b2b/PendingCallbacks";
import { Progress } from "@/components/ui/progress";

export default function B2BDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [stats, setStats] = useState({
    totalPatients: 0, urgentCases: 0, nurseFollowups: 0, stableCases: 0,
    pendingChecks: 0, medicineAdherence: 85, callsToday: 0, messagessSent: 0,
  });
  const [contactStats, setContactStats] = useState({
    totalDischarged: 0,
    contacted: 0,
    answered: 0,
    escalated: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!organization) return;

    const fetchData = async () => {
      // Fetch patient stats
      const { data: patients } = await (supabase
        .from('discharged_patients' as any)
        .select('risk_status, check_48hr_completed, discharge_message_sent')
        .eq('organization_id', organization.id)
        .eq('status', 'active') as any);

      if (patients) {
        const contacted = patients.filter((p: any) => p.discharge_message_sent || p.check_48hr_completed).length;
        const answered = patients.filter((p: any) => p.check_48hr_completed).length;
        
        setStats(prev => ({
          ...prev,
          totalPatients: patients.length,
          urgentCases: patients.filter((p: any) => p.risk_status === 'urgent').length,
          nurseFollowups: patients.filter((p: any) => p.risk_status === 'nurse_followup').length,
          stableCases: patients.filter((p: any) => p.risk_status === 'stable').length,
          pendingChecks: patients.filter((p: any) => !p.check_48hr_completed).length,
        }));

        setContactStats({
          totalDischarged: patients.length,
          contacted,
          answered,
          escalated: patients.filter((p: any) => p.risk_status === 'urgent' || p.risk_status === 'nurse_followup').length,
        });
      }

      // Fetch recent alerts
      const { data: alerts } = await (supabase
        .from('b2b_alerts' as any)
        .select('*, discharged_patients(patient_name)')
        .eq('organization_id', organization.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5) as any);

      setRecentAlerts(alerts || []);
    };

    fetchData();
  }, [organization]);

  const handleDownloadReport = async () => {
    if (!organization) return;

    const { data: patients } = await (supabase
      .from('discharged_patients' as any)
      .select('*')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('discharge_date', { ascending: false }) as any);

    if (!patients || patients.length === 0) return;

    const headers = ['Patient Name', 'Phone', 'Discharge Date', 'Ward', 'Risk Status', '48hr Check', 'Medicine Day', 'Notes'];
    const rows = patients.map((p: any) => [
      p.patient_name,
      p.mobile_number,
      p.discharge_date,
      p.ward || '',
      p.risk_status || 'pending',
      p.check_48hr_completed ? 'Done' : 'Pending',
      p.medicine_day_count || 0,
      p.nurse_call_notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const contactRate = contactStats.totalDischarged > 0 
    ? Math.round((contactStats.contacted / contactStats.totalDischarged) * 100) 
    : 0;

  return (
    <B2BLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleDownloadReport}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/b2b/upload')}>
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        <StatsCards stats={stats} />

        {/* Contact Rate Card */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Contact Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Contact Rate</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl sm:text-3xl font-bold">{contactRate}%</span>
                </div>
                <Progress value={contactRate} className="mt-2" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Discharged</p>
                <p className="text-xl sm:text-2xl font-bold">{contactStats.totalDischarged}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Contacted</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{contactStats.contacted}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Escalated</p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">{contactStats.escalated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Recent Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/b2b/alerts')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentAlerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending alerts</p>
              ) : (
                <div className="space-y-3">
                  {recentAlerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.discharged_patients?.patient_name}
                        </p>
                      </div>
                      <RiskBadge status={alert.severity === 'critical' ? 'urgent' : 'nurse_followup'} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Callbacks */}
          {organization && (
            <PendingCallbacks 
              organizationId={organization.id} 
              compact 
            />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/b2b/upload')}>
              <Upload className="h-4 w-4 mr-2" /> Upload New Patients
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/b2b/patients')}>
              <Users className="h-4 w-4 mr-2" /> View All Patients
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/b2b/alerts')}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Manage Alerts
            </Button>
          </CardContent>
        </Card>
      </div>
    </B2BLayout>
  );
}
