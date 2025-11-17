import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const checkIns = [
  {
    id: 1,
    type: "voice",
    time: "2 hours ago",
    date: "Today, 2:30 PM",
    status: "completed",
    summary: "Medicine taken, feeling good. No new symptoms reported.",
    sentiment: "positive",
  },
  {
    id: 2,
    type: "whatsapp",
    time: "1 day ago",
    date: "Yesterday, 2:30 PM",
    status: "completed",
    summary: "All medicines taken on time. Slight headache mentioned but resolved.",
    sentiment: "neutral",
  },
  {
    id: 3,
    type: "voice",
    time: "2 days ago",
    date: "Dec 15, 2:30 PM",
    status: "completed",
    summary: "Routine check-in. Everything normal, good energy levels.",
    sentiment: "positive",
  },
  {
    id: 4,
    type: "whatsapp",
    time: "3 days ago",
    date: "Dec 14, 2:30 PM",
    status: "completed",
    summary: "Forgot morning medicine but took it after reminder. No symptoms.",
    sentiment: "neutral",
  },
];

const CheckInLog = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in History</CardTitle>
        <CardDescription>Recent AI-powered health check conversations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      checkIn.type === "voice"
                        ? "bg-primary/10"
                        : "bg-accent/10"
                    }`}
                  >
                    {checkIn.type === "voice" ? (
                      <Phone className="h-5 w-5 text-primary" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-accent" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{checkIn.date}</p>
                      <Badge
                        variant="outline"
                        className={
                          checkIn.type === "voice"
                            ? "border-primary text-primary"
                            : "border-accent text-accent"
                        }
                      >
                        {checkIn.type === "voice" ? "Voice Call" : "WhatsApp"}
                      </Badge>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        checkIn.sentiment === "positive"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-info/10 text-info border-info/20"
                      }
                    >
                      {checkIn.sentiment === "positive" ? "All Good" : "Normal"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{checkIn.summary}</p>
                  
                  <p className="text-xs text-muted-foreground">{checkIn.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CheckInLog;
