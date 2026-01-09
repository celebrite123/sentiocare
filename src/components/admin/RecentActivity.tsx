import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Heart, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface RecentCheckIn {
  id: string;
  elderName: string;
  type: string;
  status: string;
  wellbeing: number | null;
  sentiment: string | null;
  createdAt: string;
}

interface RecentActivityProps {
  recentCheckIns: RecentCheckIn[];
}

const statusColors: Record<string, string> = {
  completed: "default",
  in_progress: "secondary",
  failed: "destructive",
};

const sentimentIcons: Record<string, { icon: typeof Heart; color: string }> = {
  positive: { icon: Heart, color: "text-green-500" },
  neutral: { icon: Heart, color: "text-amber-500" },
  negative: { icon: AlertTriangle, color: "text-red-500" },
};

const RecentActivity = ({ recentCheckIns }: RecentActivityProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        {recentCheckIns.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentCheckIns.map((checkIn) => {
              const TypeIcon = checkIn.type === 'voice' ? Phone : MessageSquare;
              const sentimentData = checkIn.sentiment ? sentimentIcons[checkIn.sentiment] : null;
              
              return (
                <div 
                  key={checkIn.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-full">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{checkIn.elderName}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(checkIn.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {checkIn.wellbeing !== null && (
                      <div className="text-sm font-medium">
                        {checkIn.wellbeing}/10
                      </div>
                    )}
                    {sentimentData && (
                      <sentimentData.icon className={`h-4 w-4 ${sentimentData.color}`} />
                    )}
                    <Badge variant={statusColors[checkIn.status] as any}>
                      {checkIn.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No recent check-ins
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
