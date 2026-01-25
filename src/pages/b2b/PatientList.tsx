import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { PatientTable } from "@/components/b2b/PatientTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

export default function PatientList() {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!organization) return;
    
    setLoading(true);
    const { data, error } = await (supabase
      .from('discharged_patients' as any)
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to load patients");
    }
    
    setPatients(data || []);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleExportCSV = () => {
    if (patients.length === 0) {
      toast.error("No patients to export");
      return;
    }
    
    const headers = [
      "Patient Name",
      "Mobile",
      "Discharge Date",
      "Ward",
      "Doctor",
      "Diagnosis",
      "Risk Status",
      "48hr Check",
      "Day",
      "Status"
    ];
    
    const rows = patients.map(p => [
      p.patient_name,
      p.mobile_number,
      p.discharge_date,
      p.ward || "",
      p.doctor_name || "",
      p.diagnosis || "",
      p.risk_status,
      p.check_48hr_completed ? "Done" : "Pending",
      p.medicine_day_count || 0,
      p.status
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Patients exported to CSV");
  };

  return (
    <B2BLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {patients.length} total patients
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportCSV}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={fetchPatients} disabled={loading}>
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
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
