import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, AlertTriangle, FileText, Phone, MessageSquare, TrendingUp, ExternalLink, UserPlus, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreateOrganizationDialog from "./CreateOrganizationDialog";
import AddStaffDialog from "./AddStaffDialog";
import { EditOrganizationDialog } from "./EditOrganizationDialog";

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
  contact_email?: string | null;
  contact_phone?: string | null;
  monthly_patient_limit?: number;
  monthly_sms_limit?: number;
  monthly_call_limit?: number;
  calls_used_this_month?: number;
  sms_used_this_month?: number;
  patients_this_month?: number;
  auto_48hr_check?: boolean;
  auto_medicine_reminders?: boolean;
  hospital_contact_number?: string | null;
  escalation_phone?: string | null;
  escalation_email?: string | null;
  bolna_agent_id?: string | null;
  bolna_agent_id_hindi?: string | null;
  voice_enabled?: boolean;
  default_language?: string;
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
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchB2BData();
    }
  }, [session]);

  const fetchB2BData = async () => {
    try {
      // Use admin-analytics edge function which has service role access
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching B2B data:', error);
        toast.error('Failed to load B2B analytics');
        return;
      }

      if (data?.b2b) {
        setOrganizations(data.b2b.organizations || []);
        setLeads(data.b2b.leads || []);
        setStats(data.b2b.stats || null);
      }
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
    <div className="space-y-4 md:space-y-6">
      {/* Header with quick action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            B2B Healthcare Dashboard
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Monitor hospitals and healthcare organizations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CreateOrganizationDialog onSuccess={fetchB2BData} />
          <Button onClick={() => navigate('/b2b/login')} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Open B2B Portal</span>
            <span className="sm:hidden">Portal</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
          <Card className="p-0">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Organizations</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.totalOrganizations}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{stats.activeOrganizations} active</p>
                </div>
                <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Patients</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.totalPatients}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Discharged</p>
                </div>
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.unresolvedAlerts}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Unresolved</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-destructive/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Calls</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.callsThisMonth}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">This month</p>
                </div>
                <Phone className="h-6 w-6 md:h-8 md:w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="p-0 col-span-2 sm:col-span-1">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">SMS Sent</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.smsThisMonth}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">This month</p>
                </div>
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Pipeline */}
      {stats && (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              B2B Leads Pipeline
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Track hospital inquiries and conversions</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <p className="text-lg md:text-2xl font-bold">{stats.leads.new}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">New</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <p className="text-lg md:text-2xl font-bold">{stats.leads.contacted}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Contacted</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <p className="text-lg md:text-2xl font-bold">{stats.leads.qualified}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Qualified</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-muted/50 rounded-lg hidden sm:block">
                <p className="text-lg md:text-2xl font-bold">{stats.leads.converted}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Converted</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-primary/10 rounded-lg hidden sm:block">
                <p className="text-lg md:text-2xl font-bold text-primary">{stats.leads.total}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Mobile view: cards */}
            {leads.length > 0 && (
              <div className="md:hidden space-y-2">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-3 bg-background">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm">{lead.organization_name}</p>
                      {getStatusBadge(lead.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.contact_email}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Desktop view: table */}
            {leads.length > 0 && (
              <div className="hidden md:block border rounded-lg overflow-hidden">
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
        <CardHeader className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 md:h-5 md:w-5" />
                Organizations
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Active healthcare organizations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          {organizations.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No organizations registered yet</p>
              <p className="text-xs md:text-sm mb-4">Create your first organization to get started</p>
              <CreateOrganizationDialog onSuccess={fetchB2BData} />
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {organizations.map((org) => (
                <div key={org.id} className="border rounded-lg overflow-hidden">
                  {/* Organization Row */}
                  <div 
                    className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  >
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                      <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary/50 flex-shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm md:text-base truncate">{org.name}</h4>
                        <p className="text-xs md:text-sm text-muted-foreground capitalize">{org.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
                      <div className="text-center hidden sm:block">
                        <p className="text-sm md:text-lg font-semibold">{org.patientsCount}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Patients</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-sm md:text-lg font-semibold">{org.staffCount}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Staff</p>
                      </div>
                      <div className="sm:hidden text-center">
                        <p className="text-xs font-medium">{org.patientsCount}P/{org.staffCount}S</p>
                      </div>
                      {getStatusBadge(org.status)}
                      {expandedOrg === org.id ? (
                        <ChevronUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedOrg === org.id && (
                    <div className="border-t bg-muted/30 p-3 md:p-4">
                      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-4">
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Contact Email</p>
                          <p className="text-xs md:text-sm truncate">{org.contact_email || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Contact Phone</p>
                          <p className="text-xs md:text-sm">{org.contact_phone || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Joined</p>
                          <p className="text-xs md:text-sm">{new Date(org.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Limits</p>
                          <p className="text-xs md:text-sm">
                            {org.monthly_patient_limit || 500}P / {org.monthly_call_limit || 1000}C
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <AddStaffDialog 
                          organizationId={org.id} 
                          organizationName={org.name}
                          onSuccess={fetchB2BData}
                        />
                        <EditOrganizationDialog 
                          organization={{
                            id: org.id,
                            name: org.name,
                            type: org.type,
                            contact_email: org.contact_email || null,
                            contact_phone: org.contact_phone || null,
                            monthly_patient_limit: org.monthly_patient_limit || 500,
                            monthly_sms_limit: org.monthly_sms_limit || 5000,
                            monthly_call_limit: org.monthly_call_limit || 1000,
                            patients_this_month: org.patients_this_month || 0,
                            sms_used_this_month: org.sms_used_this_month || 0,
                            calls_used_this_month: org.calls_used_this_month || 0,
                            auto_48hr_check: org.auto_48hr_check ?? true,
                            auto_medicine_reminders: org.auto_medicine_reminders ?? true,
                            hospital_contact_number: org.hospital_contact_number || null,
                            escalation_phone: org.escalation_phone || null,
                            escalation_email: org.escalation_email || null,
                            bolna_agent_id: org.bolna_agent_id || null,
                            bolna_agent_id_hindi: org.bolna_agent_id_hindi || null,
                            voice_enabled: org.voice_enabled ?? true,
                            default_language: org.default_language || "hindi",
                          }}
                          onSuccess={fetchB2BData}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default B2BAdminDashboard;
