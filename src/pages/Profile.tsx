import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Crown, Users, CreditCard, LogOut, ChevronRight, Loader2, ArrowUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileData {
  full_name: string;
  phone_number: string | null;
  email: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { 
    tier, 
    status, 
    isTrialActive, 
    trialDaysLeft, 
    elderCount, 
    maxElders, 
    canAddElder,
    loading: subscriptionLoading,
    refetch 
  } = useSubscription();
  const { initiatePayment, isLoading: paymentLoading } = useRazorpayPayment();
  
  // Dynamic pricing based on subscription tier
  const additionalElderPrice = tier === "premium" || isTrialActive ? 699 : 299;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradePlanDialogOpen, setUpgradePlanDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name,
        phone_number: data.phone_number,
        email: user?.email || null,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleUpgradeToPremium = async () => {
    const result = await initiatePayment("premium");
    if (result.success) {
      setUpgradePlanDialogOpen(false);
      refetch();
      toast({
        title: "Upgraded to Premium! 🎉",
        description: "You now have access to voice calls and all premium features.",
      });
    }
  };

  const getPlanDisplayInfo = () => {
    if (isTrialActive) {
      return {
        name: "Premium Trial",
        badge: "default" as const,
        description: `${trialDaysLeft} days left in your trial`,
      };
    }
    if (tier === "premium") {
      return {
        name: "Premium",
        badge: "default" as const,
        description: "Voice + WhatsApp check-ins",
      };
    }
    return {
      name: "Basic",
      badge: "secondary" as const,
      description: "WhatsApp check-ins only",
    };
  };

  const planInfo = getPlanDisplayInfo();
  const canUpgrade = tier === "basic" && !isTrialActive && status === "active";

  if (loading || subscriptionLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/30">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Skeleton className="h-10 w-48 mb-6" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-3xl font-bold mb-6">Profile</h1>

          {/* Account Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold">{profile?.full_name}</p>
                  {profile?.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {profile.email}
                    </p>
                  )}
                  {profile?.phone_number && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {profile.phone_number}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{planInfo.name}</span>
                    <Badge variant={planInfo.badge}>{status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{planInfo.description}</p>
                </div>
                {canUpgrade && (
                  <Dialog open={upgradePlanDialogOpen} onOpenChange={setUpgradePlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-accent gap-2">
                        <ArrowUp className="h-4 w-4" />
                        Upgrade
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upgrade to Premium</DialogTitle>
                        <DialogDescription>
                          Unlock voice calls and all premium features
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Card className="border-primary">
                          <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                              <p className="text-3xl font-bold">₹699<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                              <p className="text-sm text-muted-foreground">Premium Plan</p>
                            </div>
                            <Separator className="my-4" />
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Daily AI voice calls in Hindi/English
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Emergency callback system
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Priority 24/7 support
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                All Basic features included
                              </li>
                            </ul>
                          </CardContent>
                        </Card>

                        <Button 
                          className="w-full gap-2"
                          onClick={handleUpgradeToPremium}
                          disabled={paymentLoading}
                        >
                          {paymentLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {paymentLoading ? "Processing..." : "Pay ₹699/month"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Secure payment powered by Razorpay
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <Separator />

              {/* Elder Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Elder Slots</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {elderCount} / {maxElders} used
                  </span>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(elderCount / maxElders) * 100}%` }}
                  />
                </div>

                {!canAddElder && (
                  <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Users className="h-4 w-4" />
                        Add More Elders
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add More Elders</DialogTitle>
                        <DialogDescription>
                          Your current plan includes {maxElders} elder. To add more elders, please contact our support team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Card className="border-primary/50">
                          <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                              <p className="text-2xl font-bold">₹{additionalElderPrice}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                              <p className="text-sm text-muted-foreground">per additional elder ({tier === "premium" || isTrialActive ? "Premium" : "Basic"} rate)</p>
                            </div>
                            <Separator className="my-4" />
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Same features as your current plan
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Separate dashboard for each elder
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                Individual health tracking
                              </li>
                            </ul>
                          </CardContent>
                        </Card>

                        <div className="flex flex-col gap-2">
                          <Button 
                            className="w-full gap-2"
                            onClick={() => {
                              window.open("mailto:info@sentio.in.net?subject=Add%20More%20Elder%20Slots&body=Hi%2C%0A%0AI%20would%20like%20to%20add%20more%20elder%20slots%20to%20my%20account.%0A%0AThank%20you!", "_blank");
                              setUpgradeDialogOpen(false);
                            }}
                          >
                            <CreditCard className="h-4 w-4" />
                            Contact Support to Add
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            Multi-elder payment coming soon
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {canAddElder && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => navigate("/elders/add")}
                  >
                    <Users className="h-4 w-4" />
                    Add Elder
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                variant="outline" 
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;
