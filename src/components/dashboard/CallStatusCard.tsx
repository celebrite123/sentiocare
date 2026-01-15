import { useState, useEffect } from "react";
import { Phone, PhoneOff, PhoneMissed, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

interface CallAttempt {
  id: string;
  status: string;
  initiated_at: string;
  completed_at: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  call_type: string;
}

interface CallStatusCardProps {
  elderId: string;
}

const CallStatusCard = ({ elderId }: CallStatusCardProps) => {
  const [latestCall, setLatestCall] = useState<CallAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestCall();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('call-attempts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_attempts',
          filter: `elder_id=eq.${elderId}`,
        },
        () => {
          loadLatestCall();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [elderId]);

  const loadLatestCall = async () => {
    try {
      const { data, error } = await supabase
        .from("call_attempts")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading call status:", error);
      }
      setLatestCall(data);
    } catch (error) {
      console.error("Error loading call status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (call: CallAttempt) => {
    switch (call.status) {
      case "answered":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-accent" />,
          label: "Call Answered",
          variant: "default" as const,
          color: "text-accent",
        };
      case "initiated":
        return {
          icon: <Phone className="h-5 w-5 text-primary animate-pulse" />,
          label: "Calling...",
          variant: "secondary" as const,
          color: "text-primary",
        };
      case "no_answer":
        return {
          icon: <PhoneMissed className="h-5 w-5 text-warning" />,
          label: "No Answer",
          variant: "outline" as const,
          color: "text-warning",
        };
      case "failed":
        return {
          icon: <PhoneOff className="h-5 w-5 text-destructive" />,
          label: "Failed",
          variant: "destructive" as const,
          color: "text-destructive",
        };
      default:
        return {
          icon: <Phone className="h-5 w-5 text-muted-foreground" />,
          label: call.status,
          variant: "secondary" as const,
          color: "text-muted-foreground",
        };
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Call Status</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!latestCall) {
    return (
      <Card className="border-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Call Status</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">No Calls</div>
          <p className="text-xs text-muted-foreground">No voice calls initiated yet</p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(latestCall);
  const hasNextRetry = latestCall.next_retry_at && new Date(latestCall.next_retry_at) > new Date();
  const retriesRemaining = latestCall.max_retries - latestCall.retry_count;

  return (
    <Card className={`border-l-4 ${
      latestCall.status === "answered" ? "border-l-accent" :
      latestCall.status === "initiated" ? "border-l-primary" :
      latestCall.status === "no_answer" ? "border-l-warning" :
      latestCall.status === "failed" ? "border-l-destructive" :
      "border-l-muted"
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Last Call</CardTitle>
        {statusInfo.icon}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-xs text-muted-foreground">
            {latestCall.call_type === "emergency" ? "🚨 Emergency" : "📅 Scheduled"}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(latestCall.initiated_at), { addSuffix: true })}
            </span>
          </div>
          
          {latestCall.status === "no_answer" && hasNextRetry && (
            <div className="flex items-center gap-1 text-warning">
              <RefreshCw className="h-3 w-3" />
              <span>
                Retry in {formatDistanceToNow(new Date(latestCall.next_retry_at!), { addSuffix: false })}
              </span>
            </div>
          )}
          
          {latestCall.status === "no_answer" && retriesRemaining > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">
                {retriesRemaining} retry{retriesRemaining !== 1 ? "ies" : ""} remaining
              </span>
            </div>
          )}
          
          {latestCall.status === "failed" && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>All retry attempts failed</span>
            </div>
          )}
          
          {latestCall.status === "answered" && latestCall.completed_at && (
            <div className="flex items-center gap-1 text-accent">
              <CheckCircle2 className="h-3 w-3" />
              <span>
                Completed at {format(new Date(latestCall.completed_at), "h:mm a")}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallStatusCard;
