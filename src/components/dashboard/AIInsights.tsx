import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Brain, CheckCircle } from "lucide-react";

const AIInsights = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Analysis
        </CardTitle>
        <CardDescription>Insights from health data patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Excellent Medication Adherence</p>
              <p className="text-xs text-muted-foreground mt-1">
                100% compliance rate over the last 7 days. Keep up the great work!
              </p>
              <Badge variant="outline" className="mt-2 text-xs border-accent text-accent">
                Positive Trend
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Stable Health Patterns</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vital signs show consistent, healthy patterns. Well-being scores improving by 15% this month.
              </p>
              <Badge variant="outline" className="mt-2 text-xs border-primary text-primary">
                Stable
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <Brain className="h-5 w-5 text-secondary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Regular Communication</p>
              <p className="text-xs text-muted-foreground mt-1">
                Positive engagement in daily check-ins. Conversation quality is excellent with clear responses.
              </p>
              <Badge variant="outline" className="mt-2 text-xs border-secondary text-secondary">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInsights;
