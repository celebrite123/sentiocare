import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface CheckInStats {
  total: number;
  completed: number;
  completedRate: number;
  voiceTotal: number;
  whatsappTotal: number;
  avgWellbeing: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface CheckInAnalyticsProps {
  checkInStats: CheckInStats;
  dailyCheckIns: DailyData[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

const CheckInAnalytics = ({ checkInStats, dailyCheckIns }: CheckInAnalyticsProps) => {
  const methodData = [
    { name: 'Voice Calls', value: checkInStats.voiceTotal },
    { name: 'WhatsApp', value: checkInStats.whatsappTotal },
  ].filter(d => d.value > 0);

  // Format dates for display
  const formattedDailyData = dailyCheckIns.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Check-ins (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {formattedDailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedDailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No check-in data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Check-in Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {methodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No method data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInAnalytics;
