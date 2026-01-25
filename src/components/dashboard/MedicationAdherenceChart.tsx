import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pill, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays } from "date-fns";

interface MedicationAdherenceChartProps {
  elderId: string;
}

const MedicationAdherenceChartComponent = ({ elderId }: MedicationAdherenceChartProps) => {
  const [loading, setLoading] = useState(true);
  const [weeklyAdherence, setWeeklyAdherence] = useState(0);
  const [monthlyAdherence, setMonthlyAdherence] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({ taken: 0, missed: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ taken: 0, missed: 0 });

  useEffect(() => {
    loadData();
  }, [elderId]);

  const loadData = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get weekly check-ins
      const { data: weeklyCheckIns, error: weeklyError } = await supabase
        .from("check_ins")
        .select("medicines_taken")
        .eq("elder_id", elderId)
        .gte("created_at", sevenDaysAgo)
        .not("medicines_taken", "is", null);

      if (weeklyError) throw weeklyError;

      // Get monthly check-ins
      const { data: monthlyCheckIns, error: monthlyError } = await supabase
        .from("check_ins")
        .select("medicines_taken")
        .eq("elder_id", elderId)
        .gte("created_at", thirtyDaysAgo)
        .not("medicines_taken", "is", null);

      if (monthlyError) throw monthlyError;

      // Calculate weekly adherence
      if (weeklyCheckIns && weeklyCheckIns.length > 0) {
        const taken = weeklyCheckIns.filter(c => c.medicines_taken === true).length;
        const total = weeklyCheckIns.length;
        setWeeklyStats({ taken, missed: total - taken });
        setWeeklyAdherence(Math.round((taken / total) * 100));
      }

      // Calculate monthly adherence
      if (monthlyCheckIns && monthlyCheckIns.length > 0) {
        const taken = monthlyCheckIns.filter(c => c.medicines_taken === true).length;
        const total = monthlyCheckIns.length;
        setMonthlyStats({ taken, missed: total - taken });
        setMonthlyAdherence(Math.round((taken / total) * 100));
      }
    } catch (error) {
      console.error("Error loading medication adherence:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Pill className="h-5 w-5 text-primary" />
        <CardTitle className="text-base font-medium">Medication Adherence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last 7 Days</span>
            <span className={`text-2xl font-bold ${getAdherenceColor(weeklyAdherence)}`}>
              {weeklyAdherence}%
            </span>
          </div>
          <Progress 
            value={weeklyAdherence} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{weeklyStats.taken} taken</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span>{weeklyStats.missed} missed</span>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last 30 Days</span>
            <span className={`text-2xl font-bold ${getAdherenceColor(monthlyAdherence)}`}>
              {monthlyAdherence}%
            </span>
          </div>
          <Progress 
            value={monthlyAdherence} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{monthlyStats.taken} taken</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span>{monthlyStats.missed} missed</span>
            </div>
          </div>
        </div>

        {weeklyStats.taken === 0 && monthlyStats.taken === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            No medication data available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Memoize to prevent unnecessary re-renders when parent updates
export const MedicationAdherenceChart = memo(MedicationAdherenceChartComponent);
