import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface AlertStats {
  total: number;
  resolved: number;
  unresolved: number;
  resolutionRate: number;
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
}

interface UnresolvedAlert {
  id: string;
  elderName: string;
  title: string;
  severity: string;
  createdAt: string;
}

interface AlertsOverviewProps {
  alertStats: AlertStats;
  unresolvedAlerts: UnresolvedAlert[];
}

const severityColors: Record<string, string> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

const AlertsOverview = ({ alertStats, unresolvedAlerts }: AlertsOverviewProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alert Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto text-orange-500 mb-2" />
              <div className="text-2xl font-bold">{alertStats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{alertStats.resolved}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="h-6 w-6 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold">{alertStats.unresolved}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">By Severity</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">High: {alertStats.bySeverity.high}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Medium: {alertStats.bySeverity.medium}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Low: {alertStats.bySeverity.low}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-sm text-muted-foreground">Resolution Rate</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${alertStats.resolutionRate}%` }}
                />
              </div>
              <span className="text-sm font-medium">{alertStats.resolutionRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unresolved Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {unresolvedAlerts.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {unresolvedAlerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-start justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{alert.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {alert.elderName} • {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <Badge variant={severityColors[alert.severity] as any}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <div>All alerts resolved!</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsOverview;
