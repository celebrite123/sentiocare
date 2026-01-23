import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageSquare, Pill, AlertTriangle, CheckCircle, Clock, User, Calendar, Stethoscope } from "lucide-react";
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
import { RiskBadge } from "@/components/b2b/RiskBadge";

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
  risk_status: string;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{patient.patient_name}</h1>
            <p className="text-muted-foreground">
              Discharged: {new Date(patient.discharge_date).toLocaleDateString()}
            </p>
          </div>
          <RiskBadge status={patient.risk_status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{patient.mobile_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <p className="font-medium capitalize">{patient.language || "Hindi"}</p>
                </div>
                {patient.ward && (
                  <div>
                    <p className="text-sm text-muted-foreground">Ward</p>
                    <p className="font-medium">{patient.ward}</p>
                  </div>
                )}
                {patient.doctor_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium">{patient.doctor_name}</p>
                  </div>
                )}
                {patient.diagnosis && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="font-medium">{patient.diagnosis}</p>
                  </div>
                )}
                {patient.follow_up_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Follow-up Date</p>
                    <p className="font-medium">
                      {new Date(patient.follow_up_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medicines Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Medicines
                </CardTitle>
                <CardDescription>
                  Day {patient.medicine_day_count || 0} of 7-day monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patient.medicine_list && patient.medicine_list.length > 0 ? (
                  <div className="space-y-3">
                    {patient.medicine_list.map((med: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} - {med.timing}
                          </p>
                        </div>
                        {med.frequency && (
                          <Badge variant="outline">{med.frequency}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No medicines recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Risk Info */}
            {patient.risk_reason && (
              <Card className={patient.risk_status === "urgent" ? "border-destructive" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{patient.risk_reason}</p>
                  {patient.risk_status !== "stable" && (
                    <Button onClick={handleMarkStable} className="mt-4" variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Stable
                    </Button>
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
                <Button onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </CardContent>
            </Card>
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
                    <Badge variant="default" className="bg-green-500">Sent</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">48hr Check</span>
                  {patient.check_48hr_completed ? (
                    <Badge variant="default" className="bg-green-500">
                      {patient.check_48hr_method === "voice" ? "Called" : "Messaged"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nurse Callback</span>
                  {patient.nurse_called_back ? (
                    <Badge variant="default" className="bg-green-500">Done</Badge>
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
    </B2BLayout>
  );
};

export default PatientDetail;
