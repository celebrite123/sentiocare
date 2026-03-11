import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageSquare, Pill, AlertTriangle, CheckCircle, Clock, User, Calendar, Stethoscope, PhoneCall, Play, Pause, Volume2, Loader2, Copy, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { RiskBadge, type RiskStatus } from "@/components/b2b/RiskBadge";
import { ScheduleCallbackDialog } from "@/components/b2b/ScheduleCallbackDialog";
import { PendingCallbacks } from "@/components/b2b/PendingCallbacks";
import { formatDistanceToNow, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";

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
  caregiver_name: string | null;
  caregiver_phone: string | null;
  caregiver_relation: string | null;
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
  recording_url: string | null;
  patient_response: string | null;
  call_duration_seconds: number | null;
  answered: boolean | null;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", description: "Currently in follow-up cycle" },
  { value: "completed", label: "Completed", description: "Finished 7-day cycle" },
  { value: "readmitted", label: "Readmitted", description: "Returned to hospital" },
  { value: "opted_out", label: "Opted Out", description: "Requested no more calls" },
];

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
  const [callingNow, setCallingNow] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id && organization) {
      loadPatientData();
    }
    // Cleanup polling on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [id, organization]);

  const loadPatientData = async () => {
    try {
      const { data: patientData, error: patientError } = await supabase
        .from("discharged_patients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization!.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData as Patient);
      setNurseNotes(patientData.nurse_call_notes || "");

      const { data: commsData } = await supabase
        .from("patient_communications")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      setCommunications(commsData || []);

      const { data: checkinsData } = await supabase
        .from("patient_checkins")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      setCheckins((checkinsData || []) as Checkin[]);
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

  // Feature 1: Manual Call Trigger
  const handleCallNow = async () => {
    if (!patient || !organization) return;

    setCallingNow(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-scheduled-b2b-calls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            patient_id: patient.id,
            manual_trigger: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to initiate call");
      }

      toast({
        title: "Call initiated",
        description: "AI is now calling the patient. Results will appear automatically.",
      });
      
      // Start polling for updates every 5 seconds for 60 seconds
      setIsPolling(true);
      let pollCount = 0;
      pollIntervalRef.current = setInterval(async () => {
        pollCount++;
        await loadPatientData();
        if (pollCount >= 12) { // 12 * 5s = 60 seconds
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsPolling(false);
        }
      }, 5000);
    } catch (error: any) {
      toast({
        title: "Failed to initiate call",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCallingNow(false);
    }
  };

  // Feature 2: Status Management
  const handleStatusChange = async (newStatus: string) => {
    if (!patient) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("discharged_patients")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast({ title: `Patient status updated to ${newStatus}` });
      loadPatientData();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Feature 5: Follow-up date indicator
  const getFollowUpStatus = () => {
    if (!patient?.follow_up_date) return null;
    
    const followUpDate = new Date(patient.follow_up_date);
    const today = new Date();
    const daysDiff = differenceInDays(followUpDate, today);

    if (isPast(followUpDate) && !isToday(followUpDate)) {
      return { status: "overdue", label: "Overdue", variant: "destructive" as const };
    }
    if (isToday(followUpDate)) {
      return { status: "today", label: "Today", variant: "default" as const };
    }
    if (isTomorrow(followUpDate)) {
      return { status: "tomorrow", label: "Tomorrow", variant: "secondary" as const };
    }
    if (daysDiff <= 3) {
      return { status: "upcoming", label: `In ${daysDiff} days`, variant: "outline" as const };
    }
    return null;
  };

  const followUpStatus = getFollowUpStatus();

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
        {/* Header with Call Now and Status */}
        <div className="flex flex-col gap-3 sm:gap-4">
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

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Feature 1: Call Now Button */}
            <Button
              onClick={handleCallNow}
              disabled={callingNow || patient.status !== "active"}
              className="gap-2"
              size="sm"
            >
              {callingNow ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Call Now
                </>
              )}
            </Button>

            {/* Feature 2: Status Dropdown */}
            <Select
              value={patient.status}
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-[140px] sm:w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Feature 5: Follow-up Badge */}
            {followUpStatus && (
              <Badge variant={followUpStatus.variant} className="gap-1">
                <Calendar className="h-3 w-3" />
                Follow-up {followUpStatus.label}
              </Badge>
            )}
          </div>
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
                  <div className="col-span-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Follow-up Date</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm sm:text-base">
                        {new Date(patient.follow_up_date).toLocaleDateString()}
                      </p>
                      {followUpStatus && (
                        <Badge variant={followUpStatus.variant} className="text-xs">
                          {followUpStatus.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Caregiver Card */}
            {(patient.caregiver_name || patient.caregiver_phone) && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Registered Caregiver
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
                  {patient.caregiver_name && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Name</p>
                      <p className="font-medium text-sm sm:text-base">{patient.caregiver_name}</p>
                    </div>
                  )}
                  {patient.caregiver_relation && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Relation</p>
                      <p className="font-medium text-sm sm:text-base capitalize">{patient.caregiver_relation.replace('_', ' ')}</p>
                    </div>
                  )}
                  {patient.caregiver_phone && (
                    <div className="col-span-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm sm:text-base">{patient.caregiver_phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                  <span className="text-sm">Patient Status</span>
                  <Badge variant={patient.status === "active" ? "default" : "secondary"} className="capitalize">
                    {patient.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Discharge Message</span>
                  {patient.discharge_message_sent ? (
                    <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Sent</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">48hr Check</span>
                  {patient.check_48hr_completed ? (
                    <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                      {patient.check_48hr_method === "voice" ? "Called" : "Messaged"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nurse Callback</span>
                  {patient.nurse_called_back ? (
                    <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Done</Badge>
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

            {/* Recent Check-ins with Recording Playback */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                {checkins.length > 0 ? (
                  <div className="space-y-4">
                    {checkins.slice(0, 5).map((checkin) => (
                      <CheckinItem key={checkin.id} checkin={checkin} />
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

// Feature 3: Recording Playback Component with Collapsible Transcript
const CheckinItem = ({ checkin }: { checkin: Checkin }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayRecording = async () => {
    if (!checkin.recording_url) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If we already have the audio URL, just play
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Fetch via proxy
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-recording?patientCheckinId=${checkin.id}`,
        {
          headers: {
            "Authorization": `Bearer ${session?.session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load recording");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Create and play audio
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast({ title: "Error playing recording", variant: "destructive" });
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      toast({ title: "Failed to load recording", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!checkin.patient_response) return;
    try {
      await navigator.clipboard.writeText(checkin.patient_response);
      toast({ title: "Transcript copied to clipboard" });
    } catch (e) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const isTranscriptLong = checkin.patient_response && checkin.patient_response.length > 200;

  return (
    <div className="border-b pb-3 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {checkin.checkin_type.replace("_", " ")}
          </Badge>
          {checkin.answered !== null && (
            <Badge variant={checkin.answered ? "default" : "secondary"} className="text-xs">
              {checkin.answered ? "Answered" : "Not answered"}
            </Badge>
          )}
          {checkin.call_duration_seconds && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(checkin.call_duration_seconds)}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(checkin.created_at).toLocaleDateString()}
        </span>
      </div>
      
      {checkin.ai_summary && (
        <p className="text-sm text-muted-foreground mb-2">{checkin.ai_summary}</p>
      )}
      
      {checkin.medicines_taken !== null && (
        <p className="text-sm mb-2">
          Medicines: {checkin.medicines_taken ? "✅ Taken" : "❌ Not taken"}
        </p>
      )}

      {/* Collapsible Transcript Display */}
      {checkin.patient_response && (
        <div className="mt-2 mb-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground font-medium">Call Transcript:</p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCopyTranscript}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              {isTranscriptLong && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                >
                  {showFullTranscript ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      More
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <div 
            className={`text-sm bg-muted p-2 rounded text-muted-foreground overflow-y-auto whitespace-pre-wrap ${
              showFullTranscript ? 'max-h-96' : 'max-h-24'
            }`}
          >
            {checkin.patient_response}
          </div>
        </div>
      )}
      
      {/* Feature 3: Recording Playback */}
      {checkin.recording_url && checkin.method === "voice" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 mt-1"
          onClick={handlePlayRecording}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          <Volume2 className="h-3 w-3" />
          {isPlaying ? "Pause" : "Play Recording"}
        </Button>
      )}

      {/* Show message if no recording available but call was answered */}
      {!checkin.recording_url && checkin.answered && checkin.method === "voice" && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          Recording not available
        </p>
      )}
    </div>
  );
};

export default PatientDetail;
