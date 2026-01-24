import { useState } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { ExcelUploader, ParsedPatient, UploadResult } from "@/components/b2b/ExcelUploader";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UploadProgress {
  total: number;
  current: number;
  step: "inserting" | "sending_messages" | "complete";
}

export default function PatientUpload() {
  const { organization, refetch } = useOrganization();
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const parseMedicineList = (medicineString: string): any[] => {
    if (!medicineString || typeof medicineString !== "string") return [];
    
    // Parse comma-separated or line-separated medicines
    const medicines = medicineString.split(/[,\n]/).filter(m => m.trim());
    
    return medicines.map(med => {
      const trimmed = med.trim();
      // Try to extract dosage and timing if present
      // Pattern: "Paracetamol 500mg twice daily" or just "Paracetamol"
      const match = trimmed.match(/^(.+?)\s*(\d+\s*mg|\d+\s*ml)?(?:\s*(once|twice|thrice|morning|evening|night|daily|weekly|before|after).*)?$/i);
      
      if (match) {
        return {
          name: match[1].trim(),
          dosage: match[2]?.trim() || "",
          timing: match[3] ? trimmed.substring(trimmed.indexOf(match[3])) : "as prescribed",
        };
      }
      
      return { name: trimmed, dosage: "", timing: "as prescribed" };
    });
  };

  const parseRedFlagSymptoms = (symptoms: string): string[] => {
    if (!symptoms || typeof symptoms !== "string") return [];
    return symptoms.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  };

  const sendDischargeMessage = async (patientId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke("send-discharge-message", {
        body: { patientId },
      });
      
      if (response.error) {
        console.error("Discharge message error:", response.error);
        return false;
      }
      
      return response.data?.success || false;
    } catch (error) {
      console.error("Failed to send discharge message:", error);
      return false;
    }
  };

  const handleUpload = async (patients: ParsedPatient[]): Promise<UploadResult> => {
    if (!organization) throw new Error("No organization found");

    const results: UploadResult = {
      success: true,
      total: patients.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const insertedPatientIds: string[] = [];

    setProgress({ total: patients.length, current: 0, step: "inserting" });

    // Step 1: Insert all patients
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      try {
        // Parse discharge date
        let dischargeDate = patient.discharge_date;
        if (dischargeDate.includes("/")) {
          // Handle DD/MM/YYYY format
          const parts = dischargeDate.split("/");
          if (parts.length === 3) {
            dischargeDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        // Parse follow-up date if present
        let followUpDate = patient.follow_up_date || null;
        if (followUpDate && followUpDate.includes("/")) {
          const parts = followUpDate.split("/");
          if (parts.length === 3) {
            followUpDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        const { data, error } = await (supabase.from("discharged_patients" as any).insert({
          organization_id: organization.id,
          patient_name: patient.patient_name,
          mobile_number: patient.mobile_number,
          discharge_date: dischargeDate,
          ward: patient.ward || null,
          doctor_name: patient.doctor_name || null,
          diagnosis: patient.diagnosis || null,
          medicine_list: parseMedicineList(patient.medicine_list || ""),
          red_flag_symptoms: parseRedFlagSymptoms(patient.red_flag_symptoms || ""),
          follow_up_date: followUpDate,
          language: organization.default_language || "hindi",
          status: "active",
          check_48hr_scheduled_at: new Date(new Date(dischargeDate).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        }).select("id").single() as any);

        if (error) throw error;
        
        results.successful++;
        insertedPatientIds.push(data.id);
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 2, message: err.message });
      }

      setProgress({ total: patients.length, current: i + 1, step: "inserting" });
    }

    // Step 2: Send discharge messages for all successfully inserted patients
    if (insertedPatientIds.length > 0) {
      setProgress({ total: insertedPatientIds.length, current: 0, step: "sending_messages" });

      let messagesSent = 0;
      let messagesFailed = 0;

      for (let i = 0; i < insertedPatientIds.length; i++) {
        const success = await sendDischargeMessage(insertedPatientIds[i]);
        if (success) {
          messagesSent++;
        } else {
          messagesFailed++;
        }
        setProgress({ total: insertedPatientIds.length, current: i + 1, step: "sending_messages" });
      }

      if (messagesSent > 0) {
        toast.success(`${messagesSent} discharge messages sent`);
      }
      if (messagesFailed > 0) {
        toast.warning(`${messagesFailed} messages failed to send`);
      }
    }

    // Step 3: Increment usage counter
    try {
      await (supabase.from("organizations" as any).update({
        patients_this_month: (organization.patients_this_month || 0) + results.successful,
      }).eq("id", organization.id) as any);
      
      // Refresh organization data
      await refetch();
    } catch (error) {
      console.error("Failed to update usage counter:", error);
    }

    setProgress({ total: patients.length, current: patients.length, step: "complete" });

    results.success = results.failed === 0;
    if (results.successful > 0) {
      toast.success(`${results.successful} patients uploaded successfully`);
    }

    setTimeout(() => setProgress(null), 2000);
    return results;
  };

  const getProgressText = () => {
    if (!progress) return "";
    switch (progress.step) {
      case "inserting":
        return `Adding patients... (${progress.current}/${progress.total})`;
      case "sending_messages":
        return `Sending discharge messages... (${progress.current}/${progress.total})`;
      case "complete":
        return "Upload complete!";
      default:
        return "";
    }
  };

  return (
    <B2BLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload Patients</h1>
          <p className="text-muted-foreground mt-1">
            Bulk upload discharged patients to start automated follow-up
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>What happens after upload:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Discharge summary sent via WhatsApp immediately</li>
              <li>48-hour check-in scheduled (voice call + WhatsApp fallback)</li>
              <li>Daily medicine reminders for 7 days</li>
              <li>AI monitors responses and creates alerts for staff</li>
            </ul>
          </AlertDescription>
        </Alert>

        {progress && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">{getProgressText()}</span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        <ExcelUploader onUpload={handleUpload} />

        {organization && (
          <div className="text-sm text-muted-foreground">
            <strong>Monthly usage:</strong> {organization.patients_this_month || 0} / {organization.monthly_patient_limit || 500} patients
          </div>
        )}
      </div>
    </B2BLayout>
  );
}
