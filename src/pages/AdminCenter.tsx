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
import { Loader2, RefreshCw, Shield, BarChart3, FileText } from "lucide-react";
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
}

const AdminCenter = () => {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");

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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Unable to load analytics</h2>
            <p className="text-muted-foreground mt-2">Please try again later</p>
            <Button onClick={handleRefresh} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          {activeTab === "analytics" && (
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2">
              <FileText className="h-4 w-4" />
              Blog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            {!analytics ? (
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
                {/* Overview Cards */}
                <AdminOverviewCards 
                  overview={analytics.overview}
                  checkInStats={analytics.checkInStats}
                  alertStats={analytics.alertStats}
                />

                {/* Check-in Analytics */}
                <CheckInAnalytics 
                  checkInStats={analytics.checkInStats}
                  dailyCheckIns={analytics.trends.dailyCheckIns}
                />

                {/* Sentiment and Language */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SentimentChart sentimentBreakdown={analytics.sentimentBreakdown} />
                  <LanguageDistribution languageDistribution={analytics.languageDistribution} />
                </div>

                {/* Alerts */}
                <AlertsOverview 
                  alertStats={analytics.alertStats}
                  unresolvedAlerts={analytics.unresolvedAlerts}
                />

                {/* Recent Activity and Users */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RecentActivity recentCheckIns={analytics.recentCheckIns} />
                  <UsersList users={analytics.users} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blog">
            <BlogManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCenter;
