import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";

interface WellbeingTrendChartProps {
  elderId: string;
}

interface CheckInData {
  created_at: string;
  well_being_score: number | null;
}

const WellbeingTrendChartComponent = ({ elderId }: WellbeingTrendChartProps) => {
  const [data, setData] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");
  const [averageScore, setAverageScore] = useState(0);

  useEffect(() => {
    loadData();
  }, [elderId]);

  const loadData = async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data: checkIns, error } = await supabase
        .from("check_ins")
        .select("created_at, well_being_score")
        .eq("elder_id", elderId)
        .gte("created_at", thirtyDaysAgo)
        .not("well_being_score", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (checkIns && checkIns.length > 0) {
        // Group by date and average scores
        const groupedByDate: Record<string, number[]> = {};
        
        checkIns.forEach((checkIn: CheckInData) => {
          if (checkIn.well_being_score !== null) {
            const date = format(new Date(checkIn.created_at), "MMM dd");
            if (!groupedByDate[date]) {
              groupedByDate[date] = [];
            }
            groupedByDate[date].push(checkIn.well_being_score);
          }
        });

        const chartData = Object.entries(groupedByDate).map(([date, scores]) => ({
          date,
          score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        }));

        setData(chartData);

        // Calculate average and trend
        const allScores = checkIns
          .filter((c: CheckInData) => c.well_being_score !== null)
          .map((c: CheckInData) => c.well_being_score as number);
        
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        setAverageScore(Math.round(avg * 10) / 10);

        // Calculate trend (compare first half vs second half)
        if (allScores.length >= 4) {
          const midpoint = Math.floor(allScores.length / 2);
          const firstHalf = allScores.slice(0, midpoint);
          const secondHalf = allScores.slice(midpoint);
          const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          
          if (secondAvg > firstAvg + 0.5) setTrend("up");
          else if (secondAvg < firstAvg - 0.5) setTrend("down");
          else setTrend("stable");
        }
      }
    } catch (error) {
      console.error("Error loading wellbeing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case "up":
        return "Improving";
      case "down":
        return "Declining";
      default:
        return "Stable";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Wellbeing Score Trend</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          {getTrendIcon()}
          <span className="text-muted-foreground">{getTrendText()}</span>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{averageScore}</span>
              <span className="text-sm text-muted-foreground">avg score (last 30 days)</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 10]} 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No wellbeing data available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Memoize to prevent unnecessary re-renders when parent updates
export const WellbeingTrendChart = memo(WellbeingTrendChartComponent);
