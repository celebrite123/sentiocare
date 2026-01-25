import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Organization {
  id: string;
  name: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  address: string | null;
  default_language: string;
  monthly_patient_limit: number;
  monthly_sms_limit: number;
  monthly_call_limit: number;
  patients_this_month: number;
  sms_used_this_month: number;
  calls_used_this_month: number;
  auto_48hr_check: boolean;
  auto_medicine_reminders: boolean;
  hospital_contact_number: string | null;
  discharge_message_template: string | null;
  escalation_phone: string | null;
  escalation_email: string | null;
  bolna_agent_id: string | null;
  bolna_agent_id_hindi: string | null;
  voice_enabled: boolean;
  default_call_schedule: number[] | null;
  data_retention_days: number;
  usage_reset_at: string | null;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'staff' | 'nurse';
  name: string;
  email: string | null;
  phone: string | null;
  can_upload_patients: boolean;
  can_view_reports: boolean;
  can_manage_staff: boolean;
  is_on_duty: boolean;
}

interface OrganizationContextType {
  organization: Organization | null;
  membership: OrganizationMember | null;
  member: OrganizationMember | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  membership: null,
  member: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
};

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    if (!user) {
      setOrganization(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get member's own record first (uses "Users can view their own membership" policy)
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Member fetch error:', memberError);
        throw new Error('Failed to fetch membership data');
      }

      if (!memberData) {
        // No membership found - user is not a B2B staff member
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      setMembership(memberData as OrganizationMember);

      // Get organization details (uses "Members can view their organization" policy)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', memberData.organization_id)
        .maybeSingle();

      if (orgError) {
        console.error('Organization fetch error:', orgError);
        throw new Error('Failed to fetch organization data');
      }

      setOrganization(orgData as Organization);
    } catch (err: any) {
      console.error('Error fetching organization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        membership,
        member: membership,
        loading,
        error,
        refetch: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
