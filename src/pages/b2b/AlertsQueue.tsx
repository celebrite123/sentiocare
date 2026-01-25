import { useEffect, useState, useCallback } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { AlertCard } from "@/components/b2b/AlertCard";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, RefreshCw, Volume2 } from "lucide-react";

export default function AlertsQueue() {
  const { organization, membership } = useOrganization();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastAlertCount, setLastAlertCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    if (!organization) return;
    
    const { data, error } = await (supabase
      .from("b2b_alerts" as any)
      .select("*, discharged_patients(patient_name, mobile_number, ward, diagnosis)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }) as any);

    if (error) {
      console.error("Error fetching alerts:", error);
      return;
    }

    const formattedAlerts = (data || []).map((a: any) => ({
      ...a,
      patient_name: a.discharged_patients?.patient_name,
      patient_phone: a.discharged_patients?.mobile_number,
      patient_ward: a.discharged_patients?.ward,
      patient_diagnosis: a.discharged_patients?.diagnosis,
    }));

    // Check for new alerts and play sound
    const pendingCount = formattedAlerts.filter((a: any) => !a.resolved).length;
    if (pendingCount > lastAlertCount && lastAlertCount > 0 && soundEnabled) {
      playNotificationSound();
    }
    setLastAlertCount(pendingCount);

    setAlerts(formattedAlerts);
    setLoading(false);
  }, [organization, lastAlertCount, soundEnabled]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [organization]);

  // Setup real-time subscription
  useEffect(() => {
    if (!organization) return;

    const channel = supabase
      .channel(`b2b-alerts-${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "b2b_alerts",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          console.log("Alert change received:", payload);
          
          if (payload.eventType === "INSERT") {
            // New alert - fetch fresh data and notify
            fetchAlerts();
            if (soundEnabled) {
              playNotificationSound();
            }
            toast.info("New alert received!", {
              action: {
                label: "View",
                onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
              },
            });
          } else if (payload.eventType === "UPDATE") {
            // Alert updated - refresh
            fetchAlerts();
          } else if (payload.eventType === "DELETE") {
            // Alert deleted - refresh
            fetchAlerts();
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization, soundEnabled, fetchAlerts]);

  const playNotificationSound = () => {
    try {
      // Create a simple notification beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);

      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.15);
      }, 250);
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  };

  const handleAssign = async (alertId: string) => {
    await (supabase.from("b2b_alerts" as any).update({
      assigned_to: membership?.id,
      assigned_at: new Date().toISOString(),
    }).eq("id", alertId) as any);
    toast.success("Alert assigned to you");
    fetchAlerts();
  };

  const handleResolve = async (alertId: string, notes: string) => {
    await (supabase.from("b2b_alerts" as any).update({
      resolved: true,
      resolved_by: membership?.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    }).eq("id", alertId) as any);
    toast.success("Alert resolved");
    fetchAlerts();
  };

  const pendingAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = pendingAlerts.filter((a) => a.severity === "critical");
  const warningAlerts = pendingAlerts.filter((a) => a.severity === "warning" || a.severity === "medium");
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  return (
    <B2BLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              Alerts
              {pendingAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingAlerts.length}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage patient alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute notifications" : "Enable notifications"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchAlerts} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm sm:text-base mb-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse shrink-0" />
              <span>{criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""}</span>
            </div>
            <div className="grid gap-1 sm:gap-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-xs sm:text-sm truncate">
                  <span className="font-medium">{alert.patient_name}</span>
                  {alert.patient_ward && (
                    <span className="text-muted-foreground"> · {alert.patient_ward}</span>
                  )}
                  <span className="text-muted-foreground hidden sm:inline"> · {alert.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingAlerts.length > 0 && (
                <Badge variant="secondary">{pendingAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              Resolved
              <Badge variant="outline">{resolvedAlerts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
            ) : pendingAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold">All Clear!</h3>
                <p className="text-muted-foreground">No pending alerts. Great job!</p>
              </div>
            ) : (
              <>
                {/* Critical alerts first */}
                {criticalAlerts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-destructive flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      Critical ({criticalAlerts.length})
                    </h3>
                    {criticalAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAssign={handleAssign}
                        onResolve={handleResolve}
                        onCall={(phone) => window.open(`tel:${phone}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Warning alerts */}
                {warningAlerts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Follow-up Needed ({warningAlerts.length})
                    </h3>
                    {warningAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAssign={handleAssign}
                        onResolve={handleResolve}
                        onCall={(phone) => window.open(`tel:${phone}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Other pending */}
                {pendingAlerts.filter(
                  (a) => a.severity !== "critical" && a.severity !== "warning" && a.severity !== "medium"
                ).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-muted-foreground">Other</h3>
                    {pendingAlerts
                      .filter(
                        (a) => a.severity !== "critical" && a.severity !== "warning" && a.severity !== "medium"
                      )
                      .map((alert) => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          onAssign={handleAssign}
                          onResolve={handleResolve}
                          onCall={(phone) => window.open(`tel:${phone}`)}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4 mt-4">
            {resolvedAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No resolved alerts yet
              </p>
            ) : (
              resolvedAlerts.slice(0, 50).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </B2BLayout>
  );
}
