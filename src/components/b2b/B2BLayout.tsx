import { useEffect, useState } from "react";
import { B2BNavbar } from "./B2BNavbar";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface B2BLayoutProps {
  children: React.ReactNode;
}

export const B2BLayout = ({ children }: B2BLayoutProps) => {
  const { organization } = useOrganization();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!organization) return;

    const fetchAlertCount = async () => {
      const { count } = await (supabase
        .from('b2b_alerts' as any)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('resolved', false) as any);
      
      setAlertCount(count || 0);
    };

    fetchAlertCount();

    // Subscribe to real-time alert changes
    const channel = supabase
      .channel('b2b-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2b_alerts',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => fetchAlertCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization]);

  return (
    <div className="min-h-screen bg-background">
      <B2BNavbar alertCount={alertCount} />
      <main className="container py-6">{children}</main>
    </div>
  );
};
