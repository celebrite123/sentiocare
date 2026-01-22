import { B2BLayout } from "@/components/b2b/B2BLayout";
import { ExcelUploader } from "@/components/b2b/ExcelUploader";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PatientUpload() {
  const { organization } = useOrganization();

  const handleUpload = async (patients: any[]) => {
    if (!organization) throw new Error("No organization found");

    const results = { success: true, total: patients.length, successful: 0, failed: 0, errors: [] as any[] };

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      try {
        const { error } = await (supabase.from('discharged_patients' as any).insert({
          organization_id: organization.id,
          patient_name: patient.patient_name,
          mobile_number: patient.mobile_number,
          discharge_date: patient.discharge_date,
          ward: patient.ward || null,
          doctor_name: patient.doctor_name || null,
          diagnosis: patient.diagnosis || null,
          follow_up_date: patient.follow_up_date || null,
          check_48hr_scheduled_at: new Date(new Date(patient.discharge_date).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        }) as any);

        if (error) throw error;
        results.successful++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 2, message: err.message });
      }
    }

    results.success = results.failed === 0;
    if (results.successful > 0) toast.success(`${results.successful} patients uploaded successfully`);
    return results;
  };

  return (
    <B2BLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Upload Patients</h1>
        <ExcelUploader onUpload={handleUpload} />
      </div>
    </B2BLayout>
  );
}
