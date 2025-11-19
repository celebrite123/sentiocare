import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, Bell, Heart, Phone, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HealthMetrics from "@/components/dashboard/HealthMetrics";
import CheckInLog from "@/components/dashboard/CheckInLog";
import MedicineTracker from "@/components/dashboard/MedicineTracker";
import AIInsights from "@/components/dashboard/AIInsights";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const elderId = searchParams.get("elder");
  const [elder, setElder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (elderId) {
      loadElderData();
    }
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

  const initiateCall = async () => {
    if (!elder) return;
    
    setCalling(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-voice-call", {
        body: {
          elderId: elder.id,
          elderName: elder.full_name,
          elderPhone: elder.phone_number,
          medicines: elder.medicines || [],
          medicalConditions: elder.medical_conditions || [],
        },
      });

      if (error) throw error;

      toast({
        title: "Call Initiated",
        description: `AI assistant is calling ${elder.full_name}...`,
      });
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
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please select an elder from the Elders page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!elder) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Elder not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader elderName={elder.full_name} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-center">
          <Button 
            onClick={initiateCall} 
            disabled={calling}
            size="lg"
            className="gap-2"
          >
            <Phone className="h-5 w-5" />
            {calling ? "Calling..." : `Call ${elder.full_name}`}
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Check-in</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Completed</div>
              <p className="text-xs text-muted-foreground">Last check: 2 hours ago</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medicine Status</CardTitle>
              <Pill className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">3/3 Taken</div>
              <p className="text-xs text-muted-foreground">All medicines on time</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Well-being Score</CardTitle>
              <Heart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">8.5/10</div>
              <p className="text-xs text-muted-foreground">Feeling good today</p>
            </CardContent>
          </Card>

          <Card className="border-warning/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <Bell className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No concerns detected</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <HealthMetrics />
          <AIInsights />
        </div>

        <Tabs defaultValue="checkins" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="checkins">Check-in History</TabsTrigger>
            <TabsTrigger value="medicines">Medicines</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins">
            <CheckInLog />
          </TabsContent>

          <TabsContent value="medicines">
            <MedicineTracker />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
