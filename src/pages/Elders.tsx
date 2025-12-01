import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Phone, Settings, User, BookHeart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
      <div className="min-h-screen bg-muted/30">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Elder Profiles</h1>
                <p className="text-muted-foreground mt-1">Manage the elders you care for</p>
              </div>
              <Button onClick={() => navigate("/elders/add")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Elder
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {elders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Elders Added Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first elder profile to start monitoring their health
                </p>
                <Button onClick={() => navigate("/elders/add")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Elder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {elders.map((elder) => (
                <Card key={elder.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{elder.full_name}</CardTitle>
                        <CardDescription>
                          {elder.age ? `${elder.age} years old` : "Age not specified"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{elder.subscription_plan}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{elder.phone_number}</p>
                    </div>
                    
                    {elder.medical_conditions && elder.medical_conditions.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Medical Conditions</p>
                        <div className="flex flex-wrap gap-2">
                          {elder.medical_conditions.map((condition, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
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
                      >
                        <BookHeart className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => navigate(`/elders/${elder.id}/medicines`)}
                        variant="outline"
                        size="icon"
                        title="Manage Medicines"
                      >
                        <Settings className="h-4 w-4" />
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
