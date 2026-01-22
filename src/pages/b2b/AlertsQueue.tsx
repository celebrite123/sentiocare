import { useEffect, useState } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { AlertCard } from "@/components/b2b/AlertCard";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AlertsQueue() {
  const { organization, membership } = useOrganization();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    if (!organization) return;
    const { data } = await (supabase
      .from('b2b_alerts' as any)
      .select('*, discharged_patients(patient_name, mobile_number)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }) as any);

    setAlerts((data || []).map((a: any) => ({
      ...a,
      patient_name: a.discharged_patients?.patient_name,
      patient_phone: a.discharged_patients?.mobile_number,
    })));
  };

  useEffect(() => { fetchAlerts(); }, [organization]);

  const handleAssign = async (alertId: string) => {
    await (supabase.from('b2b_alerts' as any).update({
      assigned_to: membership?.id,
      assigned_at: new Date().toISOString(),
    }).eq('id', alertId) as any);
    toast.success("Alert assigned to you");
    fetchAlerts();
  };

  const handleResolve = async (alertId: string, notes: string) => {
    await (supabase.from('b2b_alerts' as any).update({
      resolved: true,
      resolved_by: membership?.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    }).eq('id', alertId) as any);
    toast.success("Alert resolved");
    fetchAlerts();
  };

  const pendingAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <B2BLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Alerts Queue</h1>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingAlerts.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedAlerts.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending alerts 🎉</p>
            ) : (
              pendingAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onAssign={handleAssign} onResolve={handleResolve} onCall={(p) => window.open(`tel:${p}`)} />
              ))
            )}
          </TabsContent>
          <TabsContent value="resolved" className="space-y-4 mt-4">
            {resolvedAlerts.slice(0, 20).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </B2BLayout>
  );
}
