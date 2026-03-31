import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import AdminOverviewCards from "@/components/admin/AdminOverviewCards";
import CheckInAnalytics from "@/components/admin/CheckInAnalytics";
import SentimentChart from "@/components/admin/SentimentChart";
import AlertsOverview from "@/components/admin/AlertsOverview";
import RecentActivity from "@/components/admin/RecentActivity";
import UsersList from "@/components/admin/UsersList";
import LanguageDistribution from "@/components/admin/LanguageDistribution";
import BlogManager from "@/components/admin/BlogManager";
import B2BAdminDashboard from "@/components/admin/B2BAdminDashboard";
import PilotMetrics from "@/components/admin/PilotMetrics";
import WaitlistManager from "@/components/admin/WaitlistManager";
import DemoCallPanel from "@/components/admin/DemoCallPanel";
import { Loader2, RefreshCw, Shield, BarChart3, FileText, Building2, FlaskConical, Users, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalElders: number;
    activeTrials: number;
    premiumUsers: number;
    proUsers: number;
    basicUsers: number;
    totalCheckIns: number;
    totalMedicines: number;
  };
  checkInStats: {
    total: number;
    completed: number;
    completedRate: number;
    voiceTotal: number;
    whatsappTotal: number;
    avgWellbeing: number;
  };
  alertStats: {
    total: number;
    resolved: number;
    unresolved: number;
    resolutionRate: number;
    bySeverity: {
      high: number;
      medium: number;
      low: number;
    };
  };
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  languageDistribution: Record<string, number>;
  methodDistribution: Record<string, number>;
  trends: {
    dailyCheckIns: Array<{ date: string; count: number }>;
    dailySignups: Array<{ date: string; count: number }>;
  };
  recentCheckIns: Array<{
    id: string;
    elderName: string;
    type: string;
    status: string;
    wellbeing: number | null;
    sentiment: string | null;
    createdAt: string;
  }>;
  unresolvedAlerts: Array<{
    id: string;
    elderName: string;
    title: string;
    severity: string;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    fullName: string;
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    createdAt: string;
    elderCount: number;
  }>;
  pilotMetrics?: {
    weeklyPickupRates: Array<{ week: string; totalAttempts: number; answered: number; pickupRate: number }>;
    medicationVerification: {
      total: number; verified: number; tookMeds: number; missedMeds: number; unknown: number;
      verificationRate: number; adherenceRate: number;
    };
    escalationAccuracy: {
      total: number; resolved: number; pending: number; highSeverity: number;
      highSeverityResolved: number; mediumSeverity: number; lowSeverity: number; resolutionRate: number;
    };
    familyEngagement: {
      totalFamilies: number; alertsEnabled: number; weeklySummaryEnabled: number;
      missedCheckinEnabled: number; smsEnabled: number; emailEnabled: number; engagementRate: number;
    };
    elderBreakdown: Array<{
      name: string; callsAttempted: number; callsAnswered: number; pickupRate: number;
      avgWellbeing: number; totalCheckIns: number; medsTakenRate: number; alertsTriggered: number; alertsResolved: number;
    }>;
    weeklyWellbeing: Array<{ week: string; avgScore: number; count: number }>;
  };
}

const AdminCenter = () => {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("waitlist");

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load analytics');
        return;
      }

      setAnalytics(data);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const analyticsUnavailable = !analytics;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Center</h1>
              <p className="text-muted-foreground">Platform management and insights</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="waitlist" className="gap-2">
              <Users className="h-4 w-4" />
              Waitlist
            </TabsTrigger>
            <TabsTrigger value="pilot" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Pilot Metrics
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="b2b" className="gap-2">
              <Building2 className="h-4 w-4" />
              B2B Healthcare
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <FileText className="h-4 w-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Phone className="h-4 w-4" />
              Live Demo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waitlist">
            <WaitlistManager />
          </TabsContent>

          <TabsContent value="pilot">
            {analytics.pilotMetrics ? (
              <PilotMetrics data={analytics.pilotMetrics} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">No pilot metrics data available yet</div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {analyticsUnavailable ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">Unable to load analytics</h2>
                <p className="text-muted-foreground mt-2">Please try again later</p>
                <Button onClick={handleRefresh} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <AdminOverviewCards 
                  overview={analytics.overview}
                  checkInStats={analytics.checkInStats}
                  alertStats={analytics.alertStats}
                />
                <CheckInAnalytics 
                  checkInStats={analytics.checkInStats}
                  dailyCheckIns={analytics.trends.dailyCheckIns}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SentimentChart sentimentBreakdown={analytics.sentimentBreakdown} />
                  <LanguageDistribution languageDistribution={analytics.languageDistribution} />
                </div>
                <AlertsOverview 
                  alertStats={analytics.alertStats}
                  unresolvedAlerts={analytics.unresolvedAlerts}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RecentActivity recentCheckIns={analytics.recentCheckIns} />
                  <UsersList users={analytics.users} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="b2b">
            <B2BAdminDashboard />
          </TabsContent>

          <TabsContent value="blog">
            <BlogManager />
          </TabsContent>

          <TabsContent value="demo">
            <DemoCallPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCenter;
