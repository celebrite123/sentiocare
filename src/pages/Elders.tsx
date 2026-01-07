import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Phone, Settings, User, BookHeart, Cog, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";

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
  const { tier, isTrialActive } = useSubscription();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadElders();
    }
  }, [user]);

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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Elder Profiles
                </h1>
                <p className="text-muted-foreground mt-1">Manage the elders you care for</p>
              </div>
              <Button onClick={() => navigate("/elders/add")} className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-4 w-4" />
                Add Elder
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {elders.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2">
              <CardContent>
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">No Elders Added Yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Add your first elder profile to start monitoring their health with AI-powered check-ins
                </p>
                <Button onClick={() => navigate("/elders/add")} size="lg" className="gap-2">
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
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
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
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{elder.phone_number}</span>
                    </div>
                    
                    {elder.medical_conditions && elder.medical_conditions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                          Medical Conditions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {elder.medical_conditions.slice(0, 3).map((condition, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
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

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => navigate(`/dashboard?elder=${elder.id}`)}
                        className="flex-1 gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        Dashboard
                      </Button>
                      <Button
                        onClick={() => navigate(`/elders/${elder.id}/health-book`)}
                        variant="outline"
                        size="icon"
                        title="Health Book"
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                      >
                        <BookHeart className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => navigate(`/elders/${elder.id}/settings`)}
                        variant="outline"
                        size="icon"
                        title="Schedule & Settings"
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => navigate(`/elders/${elder.id}/edit`)}
                        variant="outline"
                        size="icon"
                        title="Edit Profile"
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                      >
                        <Cog className="h-4 w-4" />
                      </Button>
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
