import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Heart, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface HealthMetricsProps {
  elderId: string;
}

interface Metric {
  id: string;
  metric_type: string;
  value: string;
  status: string | null;
  recorded_at: string;
}

const HealthMetrics = ({ elderId }: HealthMetricsProps) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [elderId]);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("health_metrics")
        .select("*")
        .eq("elder_id", elderId)
        .order("recorded_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLatestByType = (type: string) => {
    return metrics.find((m) => m.metric_type === type);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "blood_pressure":
        return <Heart className="h-5 w-5 text-primary" />;
      case "heart_rate":
        return <Activity className="h-5 w-5 text-secondary" />;
      case "temperature":
        return <Thermometer className="h-5 w-5 text-accent" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "blood_pressure":
        return "bg-primary/10";
      case "heart_rate":
        return "bg-secondary/10";
      case "temperature":
        return "bg-accent/10";
      default:
        return "bg-muted";
    }
  };

  const formatMetricName = (type: string) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Health Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const metricTypes = ["blood_pressure", "heart_rate", "temperature"];
  const displayMetrics = metricTypes.map((type) => ({
    type,
    data: getLatestByType(type),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Health Metrics
        </CardTitle>
        <CardDescription>Latest vital signs from check-ins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayMetrics.map(({ type, data }) => (
          <div
            key={type}
            className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full ${getIconBg(type)} flex items-center justify-center`}
              >
                {getIcon(type)}
              </div>
              <div>
                <p className="text-sm font-medium">{formatMetricName(type)}</p>
                <p className="text-xs text-muted-foreground">
                  {data ? formatTime(data.recorded_at) : "No data yet"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{data?.value || "--"}</p>
              <p
                className={`text-xs ${
                  data?.status === "normal"
                    ? "text-accent"
                    : data?.status === "warning"
                    ? "text-warning"
                    : "text-muted-foreground"
                }`}
              >
                {data?.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : "N/A"}
              </p>
            </div>
          </div>
        ))}

        {metrics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No health metrics recorded yet. Data will appear after check-in calls.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthMetrics;
