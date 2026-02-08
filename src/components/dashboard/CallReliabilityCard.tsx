import { useState, useEffect } from "react";
import { PhoneCall, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface CallReliabilityCardProps {
  elderId: string;
}

const CallReliabilityCard = ({ elderId }: CallReliabilityCardProps) => {
  const [stats, setStats] = useState<{ answered: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [elderId]);

  const loadStats = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("call_attempts")
        .select("status")
        .eq("elder_id", elderId)
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) {
        console.error("Error loading call reliability:", error);
        return;
      }

      // Only count primary attempts (not retries that became answered)
      // Group: answered vs everything else that's a final state
      const finalStatuses = (data || []).filter(c => 
        ["answered", "failed", "max_retries_reached", "daily_limit_reached", "no_answer"].includes(c.status)
      );

      const answered = finalStatuses.filter(c => c.status === "answered").length;
      setStats({ answered, total: finalStatuses.length });
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Call Reliability</CardTitle>
          <PhoneCall className="h-4 w-4 text-muted-foreground animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card className="border-muted">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Call Reliability</CardTitle>
          <PhoneCall className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">N/A</div>
          <p className="text-xs text-muted-foreground">No calls in last 7 days</p>
        </CardContent>
      </Card>
    );
  }

  const rate = Math.round((stats.answered / stats.total) * 100);
  const isGood = rate >= 70;
  const isWarning = rate >= 50 && rate < 70;
  const isBad = rate < 50;

  return (
    <Card className={`border-l-4 ${
      isGood ? "border-l-accent" : isWarning ? "border-l-warning" : "border-l-destructive"
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">7-Day Reliability</CardTitle>
        {isGood ? (
          <TrendingUp className="h-4 w-4 text-accent" />
        ) : isBad ? (
          <TrendingDown className="h-4 w-4 text-destructive" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-2xl font-bold ${
          isGood ? "text-accent" : isWarning ? "text-warning" : "text-destructive"
        }`}>
          {stats.answered}/{stats.total} Connected
        </div>
        <Progress 
          value={rate} 
          className="h-2"
        />
        <p className="text-xs text-muted-foreground">
          {isBad 
            ? "⚠️ Low success rate — check phone number" 
            : isWarning 
              ? "Some calls missed — monitor closely"
              : "Calls connecting well"}
        </p>
      </CardContent>
    </Card>
  );
};

export default CallReliabilityCard;
