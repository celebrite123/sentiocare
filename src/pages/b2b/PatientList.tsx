import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { PatientTable } from "@/components/b2b/PatientTable";
import { BulkActionsBar } from "@/components/b2b/BulkActionsBar";
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
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

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

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedPatients.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const updates = Array.from(selectedPatients).map(id =>
        supabase.from("discharged_patients" as any)
          .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
          .eq("id", id)
      );
      await Promise.all(updates);
      toast.success(`${selectedPatients.size} patient${selectedPatients.size > 1 ? 's' : ''} updated to ${newStatus}`);
      setSelectedPatients(new Set());
      fetchPatients();
    } catch (error: any) {
      toast.error("Failed to update patients: " + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCall = async () => {
    if (selectedPatients.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      // Call each selected patient one by one with small delay to avoid rate limits
      let successCount = 0;
      let failCount = 0;
      
      for (const patientId of Array.from(selectedPatients)) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-scheduled-b2b-calls`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.session?.access_token}`,
              },
              body: JSON.stringify({
                patient_id: patientId,
                manual_trigger: true,
              }),
            }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
          
          // Small delay between calls
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Initiated calls for ${successCount} patient${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to call ${failCount} patient${failCount > 1 ? 's' : ''}`);
      }
      
      setSelectedPatients(new Set());
      // Refresh after a delay to show updated call data
      setTimeout(fetchPatients, 3000);
    } catch (error: any) {
      toast.error("Failed to initiate bulk calls: " + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Count patients by status for summary
  const statusCounts = {
    active: patients.filter(p => p.status === "active").length,
    urgent: patients.filter(p => p.risk_status === "urgent").length,
    nurseFollowup: patients.filter(p => p.risk_status === "nurse_followup").length,
  };

  return (
    <B2BLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {patients.length} total • {statusCounts.active} active
              {statusCounts.urgent > 0 && <span className="text-destructive"> • {statusCounts.urgent} urgent</span>}
              {statusCounts.nurseFollowup > 0 && <span className="text-amber-600"> • {statusCounts.nurseFollowup} need follow-up</span>}
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
          selectedPatients={selectedPatients}
          onSelectionChange={setSelectedPatients}
        />
        
        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedPatients.size}
          onClearSelection={() => setSelectedPatients(new Set())}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkCall={handleBulkCall}
          isProcessing={bulkProcessing}
        />
      </div>
    </B2BLayout>
  );
}
