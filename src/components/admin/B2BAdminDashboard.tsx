import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, AlertTriangle, FileText, Phone, MessageSquare, TrendingUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface B2BStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalPatients: number;
  activePatients: number;
  totalAlerts: number;
  unresolvedAlerts: number;
  totalStaff: number;
  callsThisMonth: number;
  smsThisMonth: number;
  leads: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
  };
}

interface Organization {
  id: string;
  name: string;
  type: string;
  status: string;
  patientsCount: number;
  staffCount: number;
  createdAt: string;
}

interface B2BLead {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  created_at: string;
}

const B2BAdminDashboard = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<B2BStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [leads, setLeads] = useState<B2BLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchB2BData();
    }
  }, [session]);

  const fetchB2BData = async () => {
    try {
      // Fetch organizations with stats
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch organization member counts
      const orgStats = await Promise.all(
        (orgsData || []).map(async (org) => {
          const [patientsRes, staffRes] = await Promise.all([
            supabase
              .from('discharged_patients' as any)
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id),
            supabase
              .from('organization_members')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id)
          ]);

          return {
            id: org.id,
            name: org.name,
            type: org.type || 'hospital',
            status: 'active', // Organizations are considered active by default
            patientsCount: patientsRes.count || 0,
            staffCount: staffRes.count || 0,
            createdAt: org.created_at
          };
        })
      );

      setOrganizations(orgStats);

      // Fetch B2B leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('b2b_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!leadsError) {
        setLeads(leadsData || []);
      }

      // Calculate aggregate stats
      const totalPatients = orgStats.reduce((sum, org) => sum + org.patientsCount, 0);
      const totalStaff = orgStats.reduce((sum, org) => sum + org.staffCount, 0);

      // Get alert counts
      const { count: alertCount } = await supabase
        .from('b2b_alerts' as any)
        .select('id', { count: 'exact', head: true });

      const { count: unresolvedCount } = await supabase
        .from('b2b_alerts' as any)
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false);

      // Get usage stats
      const usageStats = (orgsData || []).reduce(
        (acc, org) => ({
          calls: acc.calls + (org.calls_used_this_month || 0),
          sms: acc.sms + (org.sms_used_this_month || 0)
        }),
        { calls: 0, sms: 0 }
      );

      // Get lead stats by status
      const leadStats = {
        total: leadsData?.length || 0,
        new: leadsData?.filter(l => l.status === 'new').length || 0,
        contacted: leadsData?.filter(l => l.status === 'contacted').length || 0,
        qualified: leadsData?.filter(l => l.status === 'qualified').length || 0,
        converted: leadsData?.filter(l => l.status === 'converted').length || 0,
      };

      setStats({
        totalOrganizations: orgStats.length,
        activeOrganizations: orgStats.filter(o => o.status === 'active').length,
        totalPatients,
        activePatients: totalPatients, // Could be refined with actual active status
        totalAlerts: alertCount || 0,
        unresolvedAlerts: unresolvedCount || 0,
        totalStaff,
        callsThisMonth: usageStats.calls,
        smsThisMonth: usageStats.sms,
        leads: leadStats
      });

    } catch (err) {
      console.error('Error fetching B2B data:', err);
      toast.error('Failed to load B2B analytics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive',
      new: 'outline',
      contacted: 'secondary',
      qualified: 'default',
      converted: 'default'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with quick action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            B2B Healthcare Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor hospitals and healthcare organizations
          </p>
        </div>
        <Button onClick={() => navigate('/b2b/login')} variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open B2B Portal
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Organizations</p>
                  <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
                  <p className="text-xs text-muted-foreground">{stats.activeOrganizations} active</p>
                </div>
                <Building2 className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Patients</p>
                  <p className="text-2xl font-bold">{stats.totalPatients}</p>
                  <p className="text-xs text-muted-foreground">Discharged</p>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alerts</p>
                  <p className="text-2xl font-bold">{stats.unresolvedAlerts}</p>
                  <p className="text-xs text-muted-foreground">Unresolved</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Calls</p>
                  <p className="text-2xl font-bold">{stats.callsThisMonth}</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                <Phone className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SMS Sent</p>
                  <p className="text-2xl font-bold">{stats.smsThisMonth}</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Pipeline */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              B2B Leads Pipeline
            </CardTitle>
            <CardDescription>Track hospital inquiries and conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.leads.new}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.leads.contacted}</p>
                <p className="text-xs text-muted-foreground">Contacted</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.leads.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.leads.converted}</p>
                <p className="text-xs text-muted-foreground">Converted</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats.leads.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {leads.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Organization</th>
                      <th className="text-left p-3 font-medium">Contact</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 5).map((lead) => (
                      <tr key={lead.id} className="border-t">
                        <td className="p-3 font-medium">{lead.organization_name}</td>
                        <td className="p-3">
                          <div>{lead.contact_name}</div>
                          <div className="text-xs text-muted-foreground">{lead.contact_email}</div>
                        </td>
                        <td className="p-3">{getStatusBadge(lead.status)}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
          </CardTitle>
          <CardDescription>Active healthcare organizations using B2B services</CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No organizations registered yet</p>
              <p className="text-sm">Organizations will appear here once they sign up</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Organization</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Patients</th>
                    <th className="text-left p-3 font-medium">Staff</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-t">
                      <td className="p-3 font-medium">{org.name}</td>
                      <td className="p-3 capitalize">{org.type}</td>
                      <td className="p-3">{org.patientsCount}</td>
                      <td className="p-3">{org.staffCount}</td>
                      <td className="p-3">{getStatusBadge(org.status)}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default B2BAdminDashboard;
