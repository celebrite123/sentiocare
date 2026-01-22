import { useEffect, useState } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { StatsCards } from "@/components/b2b/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, AlertTriangle, Users } from "lucide-react";
import { RiskBadge } from "@/components/b2b/RiskBadge";

export default function B2BDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [stats, setStats] = useState({
    totalPatients: 0, urgentCases: 0, nurseFollowups: 0, stableCases: 0,
    pendingChecks: 0, medicineAdherence: 85, callsToday: 0, messagessSent: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!organization) return;

    const fetchData = async () => {
      // Fetch patient stats
      const { data: patients } = await (supabase
        .from('discharged_patients' as any)
        .select('risk_status, check_48hr_completed')
        .eq('organization_id', organization.id)
        .eq('status', 'active') as any);

      if (patients) {
        setStats(prev => ({
          ...prev,
          totalPatients: patients.length,
          urgentCases: patients.filter((p: any) => p.risk_status === 'urgent').length,
          nurseFollowups: patients.filter((p: any) => p.risk_status === 'nurse_followup').length,
          stableCases: patients.filter((p: any) => p.risk_status === 'stable').length,
          pendingChecks: patients.filter((p: any) => !p.check_48hr_completed).length,
        }));
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

  return (
    <B2BLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => navigate('/b2b/upload')}>
            <Upload className="h-4 w-4 mr-2" /> Upload Patients
          </Button>
        </div>

        <StatsCards stats={stats} />

        <div className="grid md:grid-cols-2 gap-6">
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
      </div>
    </B2BLayout>
  );
}
