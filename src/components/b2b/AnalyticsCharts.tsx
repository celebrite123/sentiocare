import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, PieChartIcon, BarChart3, Activity } from "lucide-react";

interface AnalyticsChartsProps {
  organizationId: string;
}

const RISK_COLORS = {
  stable: "hsl(142, 76%, 36%)",      // Green
  nurse_followup: "hsl(45, 93%, 47%)", // Yellow
  urgent: "hsl(0, 84%, 60%)",          // Red
  pending: "hsl(217, 91%, 60%)",       // Blue
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
];

export const AnalyticsCharts = ({ organizationId }: AnalyticsChartsProps) => {
  const [timeRange, setTimeRange] = useState<"7" | "14" | "30">("7");
  const [loading, setLoading] = useState(true);
  const [callData, setCallData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Fetch call completion data by day
      const { data: checkins } = await supabase
        .from("patient_checkins")
        .select("created_at, answered, method")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Process call data by day
      const callsByDay: Record<string, { total: number; answered: number; date: string }> = {};
      (checkins || []).forEach((c: any) => {
        const date = new Date(c.created_at).toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        });
        if (!callsByDay[date]) {
          callsByDay[date] = { total: 0, answered: 0, date };
        }
        callsByDay[date].total++;
        if (c.answered) callsByDay[date].answered++;
      });
      setCallData(Object.values(callsByDay));

      // Fetch risk distribution
      const { data: patients } = await supabase
        .from("discharged_patients")
        .select("risk_status")
        .eq("organization_id", organizationId)
        .eq("status", "active");

      const riskCounts: Record<string, number> = {
        stable: 0,
        nurse_followup: 0,
        urgent: 0,
        pending: 0,
      };
      (patients || []).forEach((p: any) => {
        const status = p.risk_status || "pending";
        if (riskCounts[status] !== undefined) {
          riskCounts[status]++;
        }
      });
      setRiskData([
        { name: "Stable", value: riskCounts.stable, color: RISK_COLORS.stable },
        { name: "Follow-up", value: riskCounts.nurse_followup, color: RISK_COLORS.nurse_followup },
        { name: "Urgent", value: riskCounts.urgent, color: RISK_COLORS.urgent },
        { name: "Pending", value: riskCounts.pending, color: RISK_COLORS.pending },
      ].filter(d => d.value > 0));

      // Fetch medicine adherence trend
      const { data: adherenceCheckins } = await supabase
        .from("patient_checkins")
        .select("created_at, medicines_taken")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString())
        .not("medicines_taken", "is", null)
        .order("created_at", { ascending: true });

      const adherenceByDay: Record<string, { taken: number; total: number; date: string }> = {};
      (adherenceCheckins || []).forEach((c: any) => {
        const date = new Date(c.created_at).toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        });
        if (!adherenceByDay[date]) {
          adherenceByDay[date] = { taken: 0, total: 0, date };
        }
        adherenceByDay[date].total++;
        if (c.medicines_taken) adherenceByDay[date].taken++;
      });
      
      const adherenceArr = Object.values(adherenceByDay).map(d => ({
        ...d,
        rate: d.total > 0 ? Math.round((d.taken / d.total) * 100) : 0,
      }));
      setAdherenceData(adherenceArr);

      // Calculate 7-day funnel
      const { data: allPatients } = await supabase
        .from("discharged_patients")
        .select("id, call_schedule, status")
        .eq("organization_id", organizationId);

      let day1Completed = 0;
      let day3Completed = 0;
      let day7Completed = 0;
      let total = 0;

      (allPatients || []).forEach((p: any) => {
        total++;
        const schedule = p.call_schedule || [];
        if (schedule.some((s: any) => s.day === 1 && s.completed)) day1Completed++;
        if (schedule.some((s: any) => s.day === 3 && s.completed)) day3Completed++;
        if (schedule.some((s: any) => s.day === 7 && s.completed)) day7Completed++;
      });

      setFunnelData([
        { name: "Discharged", value: total, fill: CHART_COLORS[0] },
        { name: "Day 1 Call", value: day1Completed, fill: CHART_COLORS[1] },
        { name: "Day 3 Call", value: day3Completed, fill: CHART_COLORS[2] },
        { name: "Day 7 Call", value: day7Completed, fill: CHART_COLORS[3] },
      ]);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Toggle */}
      <div className="flex justify-end">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "7" | "14" | "30")}>
          <TabsList>
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="14">14 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Call Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Call Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={callData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Calls"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="answered" 
                    name="Answered"
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No call data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No patients to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medicine Adherence Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Medicine Adherence Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adherenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Adherence Rate"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="rate" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No adherence data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Follow-up Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              7-Day Follow-up Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 && funnelData[0].value > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                  >
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No funnel data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
