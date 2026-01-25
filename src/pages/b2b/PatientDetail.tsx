import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageSquare, Pill, AlertTriangle, CheckCircle, Clock, User, Calendar, Stethoscope, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { RiskBadge, type RiskStatus } from "@/components/b2b/RiskBadge";
import { ScheduleCallbackDialog } from "@/components/b2b/ScheduleCallbackDialog";
import { PendingCallbacks } from "@/components/b2b/PendingCallbacks";

interface Patient {
  id: string;
  patient_name: string;
  mobile_number: string;
  discharge_date: string;
  ward: string | null;
  doctor_name: string | null;
  diagnosis: string | null;
  medicine_list: any[] | null;
  red_flag_symptoms: string[] | null;
  follow_up_date: string | null;
  risk_status: RiskStatus;
  risk_reason: string | null;
  discharge_message_sent: boolean;
  check_48hr_completed: boolean;
  check_48hr_method: string | null;
  medicine_day_count: number;
  medicine_adherence: any[] | null;
  nurse_called_back: boolean;
  nurse_call_notes: string | null;
  nurse_call_at: string | null;
  language: string;
  status: string;
  created_at: string;
  organizations?: { name: string; hospital_contact_number: string | null };
}

interface Communication {
  id: string;
  direction: string;
  channel: string;
  content: string;
  status: string;
  created_at: string;
}

interface Checkin {
  id: string;
  checkin_type: string;
  method: string;
  medicines_taken: boolean | null;
  danger_symptoms_reported: string[];
  risk_level: string | null;
  ai_summary: string | null;
  created_at: string;
}

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization, member } = useOrganization();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [nurseNotes, setNurseNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);

  useEffect(() => {
    if (id && organization) {
      loadPatientData();
    }
  }, [id, organization]);

  const loadPatientData = async () => {
    try {
      // Load patient
      const { data: patientData, error: patientError } = await supabase
        .from("discharged_patients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization!.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData as Patient);
      setNurseNotes(patientData.nurse_call_notes || "");

      // Load communications
      const { data: commsData } = await supabase
        .from("patient_communications")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      setCommunications(commsData || []);

      // Load checkins
      const { data: checkinsData } = await supabase
        .from("patient_checkins")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      setCheckins(checkinsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading patient",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!patient) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("discharged_patients")
        .update({
          nurse_call_notes: nurseNotes,
          nurse_called_back: true,
          nurse_call_at: new Date().toISOString(),
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast({ title: "Notes saved successfully" });
      loadPatientData();
    } catch (error: any) {
      toast({
        title: "Error saving notes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleMarkStable = async () => {
    if (!patient) return;

    try {
      const { error } = await supabase
        .from("discharged_patients")
        .update({
          risk_status: "stable",
          risk_reason: "Marked stable by nurse after follow-up",
          risk_updated_at: new Date().toISOString(),
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast({ title: "Patient marked as stable" });
      loadPatientData();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <B2BLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </B2BLayout>
    );
  }

  if (!patient) {
    return (
      <B2BLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Patient not found</p>
          <Button variant="outline" onClick={() => navigate("/b2b/patients")} className="mt-4">
            Back to Patients
          </Button>
        </div>
      </B2BLayout>
    );
  }

  return (
    <B2BLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{patient.patient_name}</h1>
            <p className="text-sm text-muted-foreground">
              Discharged: {new Date(patient.discharge_date).toLocaleDateString()}
            </p>
          </div>
          <RiskBadge status={patient.risk_status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-sm sm:text-base">{patient.mobile_number}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Language</p>
                  <p className="font-medium text-sm sm:text-base capitalize">{patient.language || "Hindi"}</p>
                </div>
                {patient.ward && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Ward</p>
                    <p className="font-medium text-sm sm:text-base">{patient.ward}</p>
                  </div>
                )}
                {patient.doctor_name && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium text-sm sm:text-base">{patient.doctor_name}</p>
                  </div>
                )}
                {patient.diagnosis && (
                  <div className="col-span-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Diagnosis</p>
                    <p className="font-medium text-sm sm:text-base">{patient.diagnosis}</p>
                  </div>
                )}
                {patient.follow_up_date && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Follow-up Date</p>
                    <p className="font-medium text-sm sm:text-base">
                      {new Date(patient.follow_up_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medicines Card */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Pill className="h-4 w-4 sm:h-5 sm:w-5" />
                  Medicines
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Day {patient.medicine_day_count || 0} of 7-day monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {patient.medicine_list && patient.medicine_list.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {patient.medicine_list.map((med: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{med.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {med.dosage} - {med.timing}
                          </p>
                        </div>
                        {med.frequency && (
                          <Badge variant="outline" className="shrink-0 text-xs">{med.frequency}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No medicines recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Risk Info */}
            {patient.risk_reason && (
              <Card className={patient.risk_status === "urgent" ? "border-destructive" : ""}>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-xs sm:text-sm">{patient.risk_reason}</p>
                  {patient.risk_status !== "stable" && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <Button onClick={handleMarkStable} variant="outline" size="sm" className="w-full sm:w-auto">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Stable
                      </Button>
                      <Button onClick={() => setCallbackDialogOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto">
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Schedule Callback
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nurse Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Nurse Follow-up Notes
                </CardTitle>
                {patient.nurse_call_at && (
                  <CardDescription>
                    Last updated: {new Date(patient.nurse_call_at).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add notes from your call with the patient..."
                  value={nurseNotes}
                  onChange={(e) => setNurseNotes(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                  <Button variant="outline" onClick={() => setCallbackDialogOpen(true)}>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Schedule Callback
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pending Callbacks for this patient */}
            <PendingCallbacks
              organizationId={organization!.id}
              patientId={patient.id}
              onUpdate={loadPatientData}
            />
          </div>

          {/* Timeline Sidebar */}
          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Discharge Message</span>
                  {patient.discharge_message_sent ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Sent</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">48hr Check</span>
                  {patient.check_48hr_completed ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      {patient.check_48hr_method === "voice" ? "Called" : "Messaged"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nurse Callback</span>
                  {patient.nurse_called_back ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Done</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Red Flag Symptoms */}
            {patient.red_flag_symptoms && patient.red_flag_symptoms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Red Flag Symptoms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {patient.red_flag_symptoms.map((symptom, index) => (
                      <Badge key={index} variant="destructive">{symptom}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                {checkins.length > 0 ? (
                  <div className="space-y-4">
                    {checkins.slice(0, 5).map((checkin) => (
                      <div key={checkin.id} className="border-b pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="capitalize">
                            {checkin.checkin_type.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(checkin.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {checkin.ai_summary && (
                          <p className="text-sm text-muted-foreground">{checkin.ai_summary}</p>
                        )}
                        {checkin.medicines_taken !== null && (
                          <p className="text-sm">
                            Medicines: {checkin.medicines_taken ? "✅ Taken" : "❌ Not taken"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No check-ins yet</p>
                )}
              </CardContent>
            </Card>

            {/* Communication Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {communications.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {communications.slice(0, 10).map((comm) => (
                      <div
                        key={comm.id}
                        className={`p-3 rounded-lg text-sm ${
                          comm.direction === "outbound"
                            ? "bg-primary/10 ml-4"
                            : "bg-muted mr-4"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {comm.channel === "whatsapp" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <Phone className="h-3 w-3" />
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            {comm.direction}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comm.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="line-clamp-3">{comm.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Schedule Callback Dialog */}
      <ScheduleCallbackDialog
        open={callbackDialogOpen}
        onOpenChange={setCallbackDialogOpen}
        patientId={patient.id}
        patientName={patient.patient_name}
        organizationId={organization!.id}
        onScheduled={loadPatientData}
      />
    </B2BLayout>
  );
};

export default PatientDetail;
