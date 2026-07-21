import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Activity, Bell, Heart, Phone, Pill, Loader2, BookHeart, Lock, Sparkles, AlertTriangle, Clock, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useRateLimiter } from "@/hooks/useRateLimiter";
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
import { lazy, Suspense } from "react";
const WhatsAppChat = lazy(() => import("@/components/dashboard/WhatsAppChat"));
import AlertsPanel from "@/components/AlertsPanel";
import { WellbeingTrendChart } from "@/components/dashboard/WellbeingTrendChart";
import { MedicationAdherenceChart } from "@/components/dashboard/MedicationAdherenceChart";
import CallStatusCard from "@/components/dashboard/CallStatusCard";
import CallReliabilityCard from "@/components/dashboard/CallReliabilityCard";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import RenewalReminderBanner from "@/components/RenewalReminderBanner";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import { format } from "date-fns";

interface Elder {
  id: string;
  full_name: string;
  phone_number: string;
  medical_conditions: string[] | null;
  check_in_method: string;
  last_manual_call_at: string | null;
  medicines: { id: string; name: string; dosage: string; timing: string; purpose?: string }[];
  preferred_language?: string;
}

interface DashboardStats {
  todayCheckIn: { status: string; lastTime: string | null };
  medicineStatus: { taken: number; total: number };
  wellBeingScore: number | null;
  alertCount: number;
}

interface EmergencyCallStatus {
  used: number;
  remaining: number;
  resetsIn: number;
}

const MAX_EMERGENCY_CALLS_PER_MONTH = 5;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canUseVoice, isTrialActive, trialDaysLeft, tier, status, isWaitlisted, loading: subscriptionLoading, refetch } = useSubscription();
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
  const [emergencyCallStatus, setEmergencyCallStatus] = useState<EmergencyCallStatus>({
    used: 0,
    remaining: MAX_EMERGENCY_CALLS_PER_MONTH,
    resetsIn: 30,
  });
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalDismissed, setPaymentModalDismissed] = useState(false);
  
  // Rate limiter for emergency calls - 30 second cooldown, max 3 per hour
  const emergencyRateLimiter = useRateLimiter({
    cooldownMs: 30000, // 30 seconds between calls
    maxActions: 3,
    windowMs: 3600000, // 3 per hour max
  });

  // Check if trial has expired (was on trial but trial is no longer active)
  const isTrialExpired = !isTrialActive && status === "trial" && !isWaitlisted;

  useEffect(() => {
    if (elderId) {
      loadElderData();
      loadDashboardStats();
      loadEmergencyCallStatus();
    }
  }, [elderId]);

  // Show payment modal when trial expires, but not if dismissed or subscription is active
  useEffect(() => {
    if (isTrialExpired && !loading && !subscriptionLoading && !paymentModalDismissed) {
      setShowPaymentModal(true);
    }
    // Close modal if subscription becomes active
    if (status === "active") {
      setShowPaymentModal(false);
    }
  }, [isTrialExpired, loading, subscriptionLoading, paymentModalDismissed, status]);

  // Load emergency call status from profile
  const loadEmergencyCallStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("monthly_emergency_calls_used, emergency_calls_reset_at")
        .eq("user_id", user.id)
        .single();
      
      if (profile) {
        const now = new Date();
        const resetAt = profile.emergency_calls_reset_at ? new Date(profile.emergency_calls_reset_at) : null;
        let used = profile.monthly_emergency_calls_used || 0;
        
        // Check if counter should reset (new month)
        if (resetAt) {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (resetAt < monthStart) {
            used = 0;
          }
        }
        
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        setEmergencyCallStatus({
          used,
          remaining: MAX_EMERGENCY_CALLS_PER_MONTH - used,
          resetsIn: daysUntilReset,
        });
      }
    } catch (error) {
      console.error("Error loading emergency call status:", error);
    }
  };

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
      
      // PARALLEL QUERIES - Run all database calls simultaneously for maximum speed
      const [checkInsRes, latestCheckInRes, alertCountRes, medicineCountRes] = await Promise.all([
        supabase
          .from("check_ins")
          .select("id, medicines_taken, created_at")
          .eq("elder_id", elderId!)
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("check_ins")
          .select("well_being_score, medicines_taken, created_at")
          .eq("elder_id", elderId!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("elder_id", elderId!)
          .eq("resolved", false),
        supabase
          .from("medicines")
          .select("*", { count: "exact", head: true })
          .eq("elder_id", elderId!)
          .eq("active", true),
      ]);

      const checkIns = checkInsRes.data;
      const latestCheckIn = latestCheckInRes.data;
      const alertCount = alertCountRes.count;
      const medicineCount = medicineCountRes.count;

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

  const initiateEmergencyCall = async () => {
    if (!elder) return;

    if (!canUseVoice) {
      toast({
        title: "Upgrade Required",
        description: "Voice calls are available on the Premium plan. Upgrade to unlock this feature.",
        variant: "destructive",
      });
      return;
    }

    if (emergencyCallStatus.remaining <= 0) {
      toast({
        title: "Emergency Call Limit Reached",
        description: `You've used all ${MAX_EMERGENCY_CALLS_PER_MONTH} emergency calls this month. Limit resets in ${emergencyCallStatus.resetsIn} days.`,
        variant: "destructive",
      });
      return;
    }

    // Check rate limiter
    if (!emergencyRateLimiter.canPerform) {
      toast({
        title: "Please Wait",
        description: `You can make another emergency call in ${emergencyRateLimiter.cooldownRemaining} seconds.`,
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
          preferredLanguage: elder.preferred_language || "english",
          isEmergency: true,
        },
      });

      if (error) throw error;

      // Update local state
      setEmergencyCallStatus(prev => ({
        ...prev,
        used: prev.used + 1,
        remaining: prev.remaining - 1,
      }));

      toast({
        title: "Emergency Call Initiated",
        description: `AI assistant is calling ${elder.full_name}. ${data.remainingEmergencyCalls} emergency calls remaining this month.`,
      });

      setTimeout(loadDashboardStats, 5000);
    } catch (error: any) {
      console.error("Error initiating call:", error);
      
      // Handle specific error codes
      if (error.message?.includes("EMERGENCY_LIMIT_REACHED")) {
        toast({
          title: "Emergency Call Limit Reached",
          description: "You've used all emergency calls this month.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Call Failed",
          description: error.message || "Failed to initiate call",
          variant: "destructive",
        });
      }
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
      <div className="min-h-screen bg-muted/30">
        <DashboardSkeleton />
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

  const hasEmergencyCallsRemaining = emergencyCallStatus.remaining > 0;

  const handlePaymentSuccess = () => {
    setPaymentModalDismissed(true); // Prevent modal from re-opening
    setShowPaymentModal(false);
    refetch(); // Refresh subscription state
    toast({
      title: "Subscription Activated! 🎉",
      description: "You now have full access to all features.",
    });
  };

  const handleModalDismiss = () => {
    setPaymentModalDismissed(true);
    setShowPaymentModal(false);
  };

  // Wellbeing color + label helpers (semantic tokens only)
  const wellbeingTone = (score: number | null) => {
    if (score == null) return { label: "No data yet", ring: "border-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/40" };
    if (score >= 7) return { label: "Feeling great", ring: "border-primary/30", text: "text-primary", dot: "bg-primary" };
    if (score >= 4) return { label: "Could be better", ring: "border-warning/40", text: "text-warning", dot: "bg-warning" };
    return { label: "Needs attention", ring: "border-destructive/40", text: "text-destructive", dot: "bg-destructive" };
  };
  const tone = wellbeingTone(stats.wellBeingScore);

  return (
    <div className="min-h-screen bg-background">
      <TrialExpiredModal
        open={showPaymentModal}
        onSuccess={handlePaymentSuccess}
        onDismiss={handleModalDismiss}
      />
      <DashboardHeader
        elderName={elder.full_name}
        alertCount={stats.alertCount}
        onAlertsClick={() => setAlertsOpen(true)}
      />

      <main className="container mx-auto px-4 py-8 sm:py-10 max-w-6xl">
        <RenewalReminderBanner />

        {/* Trial banner */}
        {isTrialActive && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-primary/[0.06] border border-primary/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Free trial active</p>
                <p className="text-xs text-muted-foreground">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left — all Premium features unlocked
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/select-plan")}>
              Choose plan
            </Button>
          </div>
        )}

        {/* Editorial hero */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/50 p-6 sm:p-8">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/[0.05] rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="border-primary/25 text-primary bg-primary/[0.06] rounded-full">
                  {isTrialActive ? "Premium Trial" : tier === "premium" ? "Premium" : "Basic"}
                </Badge>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {format(new Date(), "EEEE, d MMM")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-foreground tracking-tight">
                How is <span className="text-primary">{elder.full_name.split(" ")[0]}</span> today?
              </h1>
              <p className="text-muted-foreground mt-2 max-w-md">
                {stats.todayCheckIn.status === "completed"
                  ? `Latest check-in ${format(new Date(stats.todayCheckIn.lastTime!), "h:mm a")} — ${tone.label.toLowerCase()}.`
                  : "No check-in yet today. We'll call at the next scheduled time."}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {canUseVoice ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="rounded-full gap-2"
                        disabled={calling || !hasEmergencyCallsRemaining}
                      >
                        {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                        {calling ? "Calling..." : `Emergency call (${emergencyCallStatus.remaining}/${MAX_EMERGENCY_CALLS_PER_MONTH})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          Emergency call to {elder.full_name}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-3">
                            <p>This will immediately initiate an AI voice call to check on {elder.full_name}'s well-being.</p>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="font-medium text-foreground">Emergency call limits</p>
                              <p className="text-sm mt-1">
                                <span className="font-semibold">{emergencyCallStatus.remaining}</span> of {MAX_EMERGENCY_CALLS_PER_MONTH} calls remaining this month
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Resets in {emergencyCallStatus.resetsIn} days</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Use only for genuine emergencies when you cannot reach your loved one.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={initiateEmergencyCall}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Phone className="h-4 w-4 mr-2" /> Confirm emergency call
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="rounded-full gap-2" onClick={() => navigate("/select-plan")}>
                        <Lock className="h-4 w-4" /> Emergency calls
                        <Badge variant="secondary" className="ml-1">Premium</Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upgrade to Premium for emergency voice calls</TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => navigate(`/elders/${elderId}/health-book`)}
                >
                  <BookHeart className="h-4 w-4" /> Health book
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full gap-2"
                  onClick={() => navigate(`/elders/${elderId}/settings`)}
                >
                  <Settings className="h-4 w-4" /> Settings
                </Button>
              </div>
            </div>

            {/* Wellbeing scorecard */}
            <div className={`bg-card rounded-2xl border-2 ${tone.ring} p-6 text-center shadow-sm`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Wellbeing</p>
              </div>
              <div className={`font-serif text-6xl ${tone.text} leading-none`}>
                {stats.wellBeingScore ?? "—"}
                {stats.wellBeingScore != null && <span className="text-2xl text-muted-foreground/60">/10</span>}
              </div>
              <p className={`text-sm mt-3 ${tone.text}`}>{tone.label}</p>
            </div>
          </div>
        </section>

        {/* Quick stats — clean grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="rounded-2xl border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's check-in</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`font-serif text-2xl ${stats.todayCheckIn.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>
                {stats.todayCheckIn.status === "completed" ? "Done" : "Pending"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.todayCheckIn.lastTime ? `Last · ${format(new Date(stats.todayCheckIn.lastTime), "h:mm a")}` : "No check-in today"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Medicines</CardTitle>
              <Pill className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl text-foreground">
                {stats.medicineStatus.taken}<span className="text-muted-foreground/50">/{stats.medicineStatus.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.medicineStatus.taken >= stats.medicineStatus.total ? "All on time" : "Some pending"}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`rounded-2xl cursor-pointer transition-shadow hover:shadow-md ${stats.alertCount > 0 ? "border-destructive/40" : "border-border"}`}
            onClick={() => setAlertsOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
              <Bell className={`h-4 w-4 ${stats.alertCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`font-serif text-2xl ${stats.alertCount > 0 ? "text-destructive" : "text-foreground"}`}>
                {stats.alertCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.alertCount > 0 ? "Tap to view" : "All clear"}
              </p>
            </CardContent>
          </Card>

          <div className="rounded-2xl">
            <CallStatusCard elderId={elderId} />
          </div>
        </div>

        <div className="mb-8">
          <CallReliabilityCard elderId={elderId} />
        </div>


          {/* Metrics and Insights */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <HealthMetrics elderId={elderId} />
            <AIInsights elderId={elderId} />
          </div>

          {/* WhatsApp Chat */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-20" />}>
              <WhatsAppChat 
                elderId={elderId} 
                elderName={elder.full_name} 
                checkInMethod={elder.check_in_method}
              />
            </Suspense>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="checkins" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checkins">Check-in History</TabsTrigger>
              <TabsTrigger value="medicines">Medicines</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="checkins">
              <CheckInLog elderId={elderId} />
            </TabsContent>

            <TabsContent value="medicines">
              <MedicineTracker elderId={elderId} />
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid gap-6 md:grid-cols-2">
                <WellbeingTrendChart elderId={elderId} />
                <MedicationAdherenceChart elderId={elderId} />
              </div>
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Alerts Panel */}
        <AlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} />
      </div>
  );
};

export default Dashboard;
