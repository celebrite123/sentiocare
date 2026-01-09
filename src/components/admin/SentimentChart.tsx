import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentChartProps {
  sentimentBreakdown: SentimentBreakdown;
}

const COLORS = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const SentimentChart = ({ sentimentBreakdown }: SentimentChartProps) => {
  const data = [
    { name: 'Positive', value: sentimentBreakdown.positive, color: COLORS.positive },
    { name: 'Neutral', value: sentimentBreakdown.neutral, color: COLORS.neutral },
    { name: 'Negative', value: sentimentBreakdown.negative, color: COLORS.negative },
  ].filter(d => d.value > 0);

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No sentiment data available
            </div>
          )}
        </div>
        
        {total > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{sentimentBreakdown.positive}</div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{sentimentBreakdown.neutral}</div>
              <div className="text-xs text-muted-foreground">Neutral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{sentimentBreakdown.negative}</div>
              <div className="text-xs text-muted-foreground">Negative</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentimentChart;
