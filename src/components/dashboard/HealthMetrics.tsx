import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Thermometer } from "lucide-react";

const HealthMetrics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Health Metrics
        </CardTitle>
        <CardDescription>Latest vital signs from check-ins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Blood Pressure</p>
              <p className="text-xs text-muted-foreground">Updated 2 hours ago</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">120/80</p>
            <p className="text-xs text-success">Normal</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium">Heart Rate</p>
              <p className="text-xs text-muted-foreground">Updated 2 hours ago</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">72 bpm</p>
            <p className="text-xs text-success">Normal</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Thermometer className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Temperature</p>
              <p className="text-xs text-muted-foreground">Self-reported today</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">98.4°F</p>
            <p className="text-xs text-success">Normal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthMetrics;
