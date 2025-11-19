import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CheckIn {
  id: string;
  check_in_type: string;
  created_at: string;
  conversation_summary: string | null;
  sentiment: string | null;
  status: string;
}

const CheckInLog = () => {
  const [searchParams] = useSearchParams();
  const elderId = searchParams.get("elder");
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (elderId) {
      loadCheckIns();
    }
  }, [elderId]);

  const loadCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("elder_id", elderId!)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error) {
      console.error("Error loading check-ins:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in History</CardTitle>
        <CardDescription>Recent AI-powered health check conversations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : checkIns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No check-ins yet</p>
          ) : (
            <div className="space-y-4">
              {checkIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      checkIn.check_in_type === "voice"
                        ? "bg-primary/10"
                        : "bg-accent/10"
                    }`}
                  >
                    {checkIn.check_in_type === "voice" ? (
                      <Phone className="h-5 w-5 text-primary" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-accent" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {format(new Date(checkIn.created_at), "MMM dd, yyyy h:mm a")}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          checkIn.check_in_type === "voice"
                            ? "border-primary text-primary"
                            : "border-accent text-accent"
                        }
                      >
                        {checkIn.check_in_type === "voice" ? "Voice Call" : "WhatsApp"}
                      </Badge>
                    </div>
                    {checkIn.sentiment && (
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
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {checkIn.conversation_summary || "No summary available"}
                  </p>
                </div>
              </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CheckInLog;
