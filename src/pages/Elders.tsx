import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, User, BookHeart, Settings, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { EldersListSkeleton } from "@/components/LoadingSkeletons";
import Navbar from "@/components/Navbar";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import RenewalReminderBanner from "@/components/RenewalReminderBanner";

interface Elder {
  id: string;
  full_name: string;
  phone_number: string;
  age: number | null;
  medical_conditions: string[] | null;
  subscription_plan: string;
}

const Elders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isTrialActive, canAddElder, maxElders, elderCount, refetch, status, isWaitlisted, loading: subscriptionLoading } = useSubscription();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalDismissed, setPaymentModalDismissed] = useState(false);
  
  // Show payment modal if trial expired (never for waitlisted users)
  const isTrialExpired = !isTrialActive && status === "trial" && !isWaitlisted;

  useEffect(() => {
    if (user) {
      loadElders();
      // Note: refetch() removed - useSubscription already loads on mount, avoid duplicate calls
    }
  }, [user]);

  // Show payment modal when trial expires, but not if dismissed or subscription is active
  // CRITICAL: Wait for both loading states to complete before showing modal
  useEffect(() => {
    if (isTrialExpired && !loading && !subscriptionLoading && !paymentModalDismissed) {
      setShowPaymentModal(true);
    }
    // Close modal if subscription becomes active
    if (status === "active") {
      setShowPaymentModal(false);
    }
  }, [isTrialExpired, loading, subscriptionLoading, paymentModalDismissed, status]);

  const loadElders = async () => {
    try {
      // First get the profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Profile not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Then get elders
      const { data, error } = await supabase
        .from("elders")
        .select("*")
        .eq("family_member_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setElders(data || []);
    } catch (error) {
      console.error("Error loading elders:", error);
      toast({
        title: "Error",
        description: "Failed to load elder profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get display badge text based on subscription status
  const getSubscriptionBadge = () => {
    if (isTrialActive) {
      return { text: "Premium Trial", variant: "default" as const };
    }
    if (tier === "premium") {
      return { text: "Premium", variant: "default" as const };
    }
    return { text: "Basic", variant: "secondary" as const };
  };

  const subscriptionBadge = getSubscriptionBadge();

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <EldersListSkeleton />
          </div>
        </div>
      </>
    );
  }

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

  return (
    <>
      <Navbar />
      <TrialExpiredModal 
        open={showPaymentModal} 
        onSuccess={handlePaymentSuccess}
        onDismiss={handleModalDismiss}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-16 z-10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Elder Profiles
                </h1>
                <p className="text-muted-foreground mt-1">Manage the elders you care for</p>
              </div>
              <div className="flex items-center gap-3">
                {!canAddElder && (
                  <Badge variant="outline" className="text-xs">
                    {elderCount}/{maxElders} elder
                  </Badge>
                )}
                <Button 
                  onClick={() => {
                    if (!canAddElder) {
                      toast({
                        title: "Upgrade Required",
                        description: "Contact support at info@sentio.in.net to add additional elder slots to your plan.",
                      });
                      return;
                    }
                    navigate("/elders/add");
                  }} 
                  className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Elder</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <RenewalReminderBanner />
          
          {elders.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2 border-primary/30">
              <CardContent>
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">No Elders Added Yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Add your first elder profile to start monitoring their health with AI-powered check-ins
                </p>
                <Button 
                  onClick={() => navigate("/elders/add")} 
                  size="lg" 
                  disabled={!canAddElder}
                  className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Elder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {elders.map((elder) => (
                <Card 
                  key={elder.id} 
                  className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {elder.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {elder.full_name}
                          </CardTitle>
                          <CardDescription>
                            {elder.age ? `${elder.age} years old` : "Age not specified"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={subscriptionBadge.variant} className="shrink-0">
                        {subscriptionBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {elder.phone_number}
                    </p>
                    
                    {elder.medical_conditions && elder.medical_conditions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                          Medical Conditions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {elder.medical_conditions.slice(0, 3).map((condition, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-secondary/10 text-secondary">
                              {condition}
                            </Badge>
                          ))}
                          {elder.medical_conditions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{elder.medical_conditions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-4 border-t">
                      {/* Primary action - View Dashboard */}
                      <Button
                        onClick={() => navigate(`/dashboard?elder=${elder.id}`)}
                        className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-11"
                      >
                        <Activity className="h-5 w-5" />
                        View Dashboard
                      </Button>
                      
                      {/* Secondary actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => navigate(`/elders/${elder.id}/health-book`)}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-primary/5 hover:border-primary/50"
                        >
                          <BookHeart className="h-5 w-5 text-primary" />
                          <span className="text-xs font-medium">Health Book</span>
                        </Button>
                        <Button
                          onClick={() => navigate(`/elders/${elder.id}/settings`)}
                          variant="outline"
                          className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-secondary/5 hover:border-secondary/50"
                        >
                          <Settings className="h-5 w-5 text-secondary" />
                          <span className="text-xs font-medium">Manage</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Elders;
