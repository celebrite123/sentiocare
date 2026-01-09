import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LanguageDistributionProps {
  languageDistribution: Record<string, number>;
}

const LanguageDistribution = ({ languageDistribution }: LanguageDistributionProps) => {
  const data = Object.entries(languageDistribution).map(([lang, count]) => ({
    language: lang.charAt(0).toUpperCase() + lang.slice(1),
    count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Language Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  dataKey="language" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                  width={80}
                />
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
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No language data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageDistribution;
