import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Brain, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightsProps {
  elderId: string;
}

interface CheckIn {
  sentiment: string | null;
  well_being_score: number | null;
  medicines_taken: boolean | null;
  created_at: string;
}

const AIInsights = ({ elderId }: AIInsightsProps) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckIns();
  }, [elderId]);

  const loadCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select("sentiment, well_being_score, medicines_taken, created_at")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error) {
      console.error("Error loading check-ins:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate insights
  const medicineAdherence = checkIns.length > 0
    ? Math.round(
        (checkIns.filter((c) => c.medicines_taken === true).length / checkIns.length) * 100
      )
    : 0;

  const avgWellBeing = checkIns.length > 0
    ? (
        checkIns.reduce((sum, c) => sum + (c.well_being_score || 0), 0) /
        checkIns.filter((c) => c.well_being_score !== null).length
      ).toFixed(1)
    : "N/A";

  const recentSentiments = checkIns.slice(0, 7);
  const positiveSentiments = recentSentiments.filter(
    (c) => c.sentiment === "positive"
  ).length;
  const sentimentTrend =
    recentSentiments.length > 0
      ? positiveSentiments >= recentSentiments.length / 2
        ? "positive"
        : "needs attention"
      : "unknown";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (checkIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Analysis
          </CardTitle>
          <CardDescription>Insights from health data patterns</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No check-in data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Insights will appear after AI voice calls
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Analysis
        </CardTitle>
        <CardDescription>Insights from {checkIns.length} check-ins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Medication Adherence */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              medicineAdherence >= 80
                ? "bg-accent/10 border-accent/20"
                : medicineAdherence >= 50
                ? "bg-warning/10 border-warning/20"
                : "bg-destructive/10 border-destructive/20"
            }`}
          >
            {medicineAdherence >= 80 ? (
              <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">Medication Adherence</p>
              <p className="text-xs text-muted-foreground mt-1">
                {medicineAdherence}% compliance rate over the last {checkIns.length} check-ins
              </p>
              <Badge
                variant="outline"
                className={`mt-2 text-xs ${
                  medicineAdherence >= 80
                    ? "border-accent text-accent"
                    : "border-warning text-warning"
                }`}
              >
                {medicineAdherence >= 80 ? "On Track" : "Needs Attention"}
              </Badge>
            </div>
          </div>

          {/* Well-being Score */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            {Number(avgWellBeing) >= 7 ? (
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            ) : (
              <TrendingDown className="h-5 w-5 text-primary mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">Average Well-being Score</p>
              <p className="text-xs text-muted-foreground mt-1">
                {avgWellBeing}/10 average based on self-reported feelings
              </p>
              <Badge variant="outline" className="mt-2 text-xs border-primary text-primary">
                {Number(avgWellBeing) >= 7
                  ? "Feeling Good"
                  : Number(avgWellBeing) >= 5
                  ? "Moderate"
                  : "Needs Support"}
              </Badge>
            </div>
          </div>

          {/* Sentiment Trend */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              sentimentTrend === "positive"
                ? "bg-secondary/10 border-secondary/20"
                : "bg-warning/10 border-warning/20"
            }`}
          >
            <Brain
              className={`h-5 w-5 mt-0.5 ${
                sentimentTrend === "positive" ? "text-secondary" : "text-warning"
              }`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Communication Quality</p>
              <p className="text-xs text-muted-foreground mt-1">
                {positiveSentiments} out of {recentSentiments.length} recent check-ins had
                positive sentiment
              </p>
              <Badge
                variant="outline"
                className={`mt-2 text-xs ${
                  sentimentTrend === "positive"
                    ? "border-secondary text-secondary"
                    : "border-warning text-warning"
                }`}
              >
                {sentimentTrend === "positive" ? "Engaged" : "Monitor"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInsights;
