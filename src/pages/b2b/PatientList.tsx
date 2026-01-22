import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { PatientTable } from "@/components/b2b/PatientTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";

export default function PatientList() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;

    const fetchPatients = async () => {
      setLoading(true);
      const { data } = await (supabase
        .from('discharged_patients' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false }) as any);

      setPatients(data || []);
      setLoading(false);
    };

    fetchPatients();
  }, [organization]);

  return (
    <B2BLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Patients</h1>
        <PatientTable
          patients={patients}
          loading={loading}
          onViewPatient={(id) => navigate(`/b2b/patients/${id}`)}
          onCallPatient={(phone) => window.open(`tel:${phone}`)}
        />
      </div>
    </B2BLayout>
  );
}
