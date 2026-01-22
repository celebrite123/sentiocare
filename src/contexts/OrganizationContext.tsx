import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Organization {
  id: string;
  name: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
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
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  membership: null,
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

      // Get member's organization using any type to bypass type checking for new tables
      const { data: memberData, error: memberError } = await (supabase
        .from('organization_members' as any)
        .select('*')
        .eq('user_id', user.id)
        .single() as any);

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          // No membership found
          setOrganization(null);
          setMembership(null);
        } else {
          throw memberError;
        }
        setLoading(false);
        return;
      }

      setMembership(memberData as OrganizationMember);

      // Get organization details
      const { data: orgData, error: orgError } = await (supabase
        .from('organizations' as any)
        .select('*')
        .eq('id', memberData.organization_id)
        .single() as any);

      if (orgError) throw orgError;
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
        loading,
        error,
        refetch: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
