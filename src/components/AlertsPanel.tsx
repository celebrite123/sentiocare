import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  alert_type: string;
  resolved: boolean;
  created_at: string;
  elder_id: string;
}

interface AlertsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertsPanel = ({ open, onOpenChange }: AlertsPanelProps) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadAlerts();
    }
  }, [open, user]);

  const loadAlerts = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) return;

      const { data: elders } = await supabase
        .from("elders")
        .select("id")
        .eq("family_member_id", profile.id);

      if (!elders || elders.length === 0) {
        setAlerts([]);
        return;
      }

      const elderIds = elders.map((e) => e.id);

      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .in("elder_id", elderIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ resolved: true })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)));
      toast({
        title: "Alert Resolved",
        description: "The alert has been marked as resolved.",
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Alerts
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedCount} unresolved
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-accent mb-4" />
              <p className="text-muted-foreground">No alerts</p>
              <p className="text-sm text-muted-foreground mt-1">
                Everything looks good with your elders
              </p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.resolved ? "opacity-60" : ""
                  } ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs opacity-60">
                          {format(new Date(alert.created_at), "MMM d, h:mm a")}
                        </span>
                        {!alert.resolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AlertsPanel;
