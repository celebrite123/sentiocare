import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Activity, Bell, Heart, Phone, Pill, Loader2, BookHeart, Lock, Sparkles, AlertTriangle, Clock, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HealthMetrics from "@/components/dashboard/HealthMetrics";
import CheckInLog from "@/components/dashboard/CheckInLog";
import MedicineTracker from "@/components/dashboard/MedicineTracker";
import AIInsights from "@/components/dashboard/AIInsights";
import WhatsAppChat from "@/components/dashboard/WhatsAppChat";
import AlertsPanel from "@/components/AlertsPanel";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

interface Elder {
  id: string;
  full_name: string;
  phone_number: string;
  medical_conditions: string[] | null;
  check_in_method: string;
  last_manual_call_at: string | null;
  medicines: { id: string; name: string; dosage: string; timing: string }[];
}

interface DashboardStats {
  todayCheckIn: { status: string; lastTime: string | null };
  medicineStatus: { taken: number; total: number };
  wellBeingScore: number | null;
  alertCount: number;
}

const CALL_COOLDOWN_HOURS = 4;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canUseVoice, isTrialActive, trialDaysLeft, tier, loading: subscriptionLoading } = useSubscription();
  const [searchParams] = useSearchParams();
  const elderId = searchParams.get("elder") || searchParams.get("elderId");
  const [elder, setElder] = useState<Elder | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayCheckIn: { status: "pending", lastTime: null },
    medicineStatus: { taken: 0, total: 0 },
    wellBeingScore: null,
    alertCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    if (elderId) {
      loadElderData();
      loadDashboardStats();
    }
  }, [elderId]);

  // Update cooldown timer every minute
  useEffect(() => {
    if (!elder?.last_manual_call_at) {
      setCooldownRemaining(null);
      return;
    }

    const updateCooldown = () => {
      const lastCallTime = new Date(elder.last_manual_call_at!);
      const now = new Date();
      const hoursSinceCall = differenceInHours(now, lastCallTime);
      
      if (hoursSinceCall >= CALL_COOLDOWN_HOURS) {
        setCooldownRemaining(null);
      } else {
        const cooldownEnd = new Date(lastCallTime.getTime() + CALL_COOLDOWN_HOURS * 60 * 60 * 1000);
        const minutesRemaining = differenceInMinutes(cooldownEnd, now);
        const hours = Math.floor(minutesRemaining / 60);
        const mins = minutesRemaining % 60;
        setCooldownRemaining(`${hours}h ${mins}m`);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [elder?.last_manual_call_at]);

  useEffect(() => {
    if (!elderId) return;

    const channel = supabase
      .channel('check-ins-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
          filter: `elder_id=eq.${elderId}`,
        },
        () => {
          console.log('New check-in detected, refreshing stats...');
          loadDashboardStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [elderId]);

  const loadElderData = async () => {
    try {
      const { data, error } = await supabase
        .from("elders")
        .select("*, medicines(*)")
        .eq("id", elderId!)
        .single();

      if (error) throw error;
      setElder(data);
    } catch (error) {
      console.error("Error loading elder:", error);
      toast({
        title: "Error",
        description: "Failed to load elder data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("*")
        .eq("elder_id", elderId!)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      const { data: latestCheckIn } = await supabase
        .from("check_ins")
        .select("well_being_score, medicines_taken, created_at")
        .eq("elder_id", elderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count: alertCount } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("elder_id", elderId!)
        .eq("resolved", false);

      const { count: medicineCount } = await supabase
        .from("medicines")
        .select("*", { count: "exact", head: true })
        .eq("elder_id", elderId!)
        .eq("active", true);

      const medicinesTakenToday = checkIns?.filter((c) => c.medicines_taken)?.length || 0;

      setStats({
        todayCheckIn: {
          status: checkIns && checkIns.length > 0 ? "completed" : "pending",
          lastTime: checkIns?.[0]?.created_at || null,
        },
        medicineStatus: {
          taken: Math.min(medicinesTakenToday, medicineCount || 0),
          total: medicineCount || 0,
        },
        wellBeingScore: latestCheckIn?.well_being_score || null,
        alertCount: alertCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const initiateCall = async (isEmergency: boolean = false) => {
    if (!elder) return;

    if (!canUseVoice) {
      toast({
        title: "Upgrade Required",
        description: "Voice calls are available on the Premium plan. Upgrade to unlock this feature.",
        variant: "destructive",
      });
      return;
    }

    // Check cooldown (unless emergency)
    if (!isEmergency && cooldownRemaining) {
      toast({
        title: "Call Cooldown Active",
        description: `Please wait ${cooldownRemaining} before calling again, or use Emergency Call.`,
        variant: "destructive",
      });
      return;
    }

    setCalling(true);
    try {
      const { data, error } = await supabase.functions.invoke("bolna-voice-call", {
        body: {
          elderId: elder.id,
          elderName: elder.full_name,
          elderPhone: elder.phone_number,
          medicines: elder.medicines || [],
          medicalConditions: elder.medical_conditions || [],
          isEmergency,
        },
      });

      if (error) throw error;

      // Update last_manual_call_at
      await supabase
        .from("elders")
        .update({ last_manual_call_at: new Date().toISOString() })
        .eq("id", elder.id);

      // Refresh elder data to get updated cooldown
      loadElderData();

      toast({
        title: isEmergency ? "Emergency Call Initiated" : "Call Initiated",
        description: `AI assistant is calling ${elder.full_name}...`,
      });

      setTimeout(loadDashboardStats, 5000);
    } catch (error: any) {
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setCalling(false);
    }
  };

  if (!elderId) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Please select an elder from the Elders page
            </p>
            <Button className="mt-4" onClick={() => window.location.href = "/elders"}>
              Go to Elders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!elder) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Elder not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOnCooldown = !!cooldownRemaining;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <DashboardHeader 
        elderName={elder.full_name} 
        alertCount={stats.alertCount}
        onAlertsClick={() => setAlertsOpen(true)}
      />

      <main className="container mx-auto px-4 py-6 sm:py-8">
          {/* Trial Banner */}
          {isTrialActive && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Free Trial Active</p>
                  <p className="text-sm text-muted-foreground">
                    {trialDaysLeft} days left - All Premium features unlocked
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/select-plan")}>
                Choose Plan
              </Button>
            </div>
          )}

          {/* Tier Badge - Fixed to show Premium Trial during trial */}
          <div className="mb-4 flex items-center gap-2">
            <Badge variant={canUseVoice ? "default" : "secondary"}>
              {isTrialActive ? "Premium Trial" : tier === "premium" ? "Premium" : "Basic"} Plan
            </Badge>
            {!canUseVoice && !isTrialActive && (
              <Badge variant="outline" className="text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                Voice calls locked
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            {canUseVoice ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-primary hover:opacity-90"
                    disabled={calling}
                  >
                    {calling ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isOnCooldown ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      <Phone className="h-5 w-5" />
                    )}
                    {calling ? "Calling..." : isOnCooldown ? `Call ${elder.full_name} (${cooldownRemaining})` : `Call ${elder.full_name}`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Call {elder.full_name}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isOnCooldown ? (
                        <>
                          <div className="flex items-center gap-2 mb-3 text-warning">
                            <Clock className="h-4 w-4" />
                            <span>Cooldown active: {cooldownRemaining} remaining</span>
                          </div>
                          <p>Regular calls are limited to once every {CALL_COOLDOWN_HOURS} hours. You can still make an emergency call if urgent.</p>
                        </>
                      ) : (
                        <p>Our AI assistant will call {elder.full_name} to check on their health and medication adherence.</p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {!isOnCooldown && (
                      <AlertDialogAction
                        onClick={() => initiateCall(false)}
                        className="bg-primary text-primary-foreground"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </AlertDialogAction>
                    )}
                    <AlertDialogAction
                      onClick={() => initiateCall(true)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Emergency Call
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    className="gap-2"
                    variant="outline"
                    onClick={() => navigate("/select-plan")}
                  >
                    <Lock className="h-5 w-5" />
                    Voice Calls
                    <Badge variant="secondary" className="ml-2">Premium</Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to Premium for AI voice calls</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Button
              onClick={() => navigate(`/elders/${elderId}/health-book`)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <BookHeart className="h-5 w-5" />
              Health Book
            </Button>
            
            <Button
              onClick={() => navigate(`/elders/${elderId}/settings`)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Check-in</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stats.todayCheckIn.status === "completed"
                      ? "text-accent"
                      : "text-muted-foreground"
                  }`}
                >
                  {stats.todayCheckIn.status === "completed" ? "Completed" : "Pending"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.todayCheckIn.lastTime
                    ? `Last: ${format(new Date(stats.todayCheckIn.lastTime), "h:mm a")}`
                    : "No check-in today"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medicine Status</CardTitle>
                <Pill className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {stats.medicineStatus.taken}/{stats.medicineStatus.total} Taken
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.medicineStatus.taken >= stats.medicineStatus.total
                    ? "All medicines on time"
                    : "Medicines pending"}
                </p>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${
              stats.wellBeingScore && stats.wellBeingScore >= 7 
                ? "border-l-accent" 
                : stats.wellBeingScore && stats.wellBeingScore >= 4 
                  ? "border-l-warning" 
                  : stats.wellBeingScore 
                    ? "border-l-destructive" 
                    : "border-l-muted"
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Well-being Score</CardTitle>
                <Heart className={`h-4 w-4 ${
                  stats.wellBeingScore && stats.wellBeingScore >= 7 
                    ? "text-accent" 
                    : stats.wellBeingScore && stats.wellBeingScore >= 4 
                      ? "text-warning" 
                      : stats.wellBeingScore 
                        ? "text-destructive" 
                        : "text-muted-foreground"
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  stats.wellBeingScore && stats.wellBeingScore >= 7 
                    ? "text-accent" 
                    : stats.wellBeingScore && stats.wellBeingScore >= 4 
                      ? "text-warning" 
                      : stats.wellBeingScore 
                        ? "text-destructive" 
                        : "text-muted-foreground"
                }`}>
                  {stats.wellBeingScore ? `${stats.wellBeingScore}/10` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.wellBeingScore
                    ? stats.wellBeingScore >= 7
                      ? "Feeling great"
                      : stats.wellBeingScore >= 4
                        ? "Could be better"
                        : "Needs attention"
                    : "No data yet"}
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${stats.alertCount > 0 ? "border-destructive/40" : "border-muted"}`}
              onClick={() => setAlertsOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <Bell
                  className={`h-4 w-4 ${
                    stats.alertCount > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stats.alertCount > 0 ? "text-destructive" : ""
                  }`}
                >
                  {stats.alertCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.alertCount > 0
                    ? "Click to view details"
                    : "No concerns detected"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics and Insights */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <HealthMetrics elderId={elderId} />
            <AIInsights elderId={elderId} />
          </div>

          {/* WhatsApp Chat */}
          <div className="mb-8">
            <WhatsAppChat 
              elderId={elderId} 
              elderName={elder.full_name} 
              checkInMethod={elder.check_in_method}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="checkins" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="checkins">Check-in History</TabsTrigger>
              <TabsTrigger value="medicines">Medicines</TabsTrigger>
            </TabsList>

            <TabsContent value="checkins">
              <CheckInLog elderId={elderId} />
            </TabsContent>

            <TabsContent value="medicines">
              <MedicineTracker elderId={elderId} />
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Alerts Panel */}
        <AlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} />
      </div>
  );
};

export default Dashboard;
