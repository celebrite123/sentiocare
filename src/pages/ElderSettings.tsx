import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Bell, Save, Loader2, Globe, Phone, MessageCircle, Lock, User, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import HealthMonitoringCard from "@/components/settings/HealthMonitoringCard";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const ElderSettings = () => {
  const { elderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUseVoice, tier, isTrialActive } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [elderName, setElderName] = useState("");

  // Elder profile state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [originalAge, setOriginalAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [showAgeConfirm, setShowAgeConfirm] = useState(false);

  // Communication state
  const [preferredLanguage, setPreferredLanguage] = useState("english");
  // Check-in method is now auto-determined by subscription tier
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Schedule state
  const [scheduleActive, setScheduleActive] = useState(false);
  const [scheduleType, setScheduleType] = useState<"daily" | "weekly">("daily");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  // Notification state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [notifyOnAlert, setNotifyOnAlert] = useState(true);
  const [notifyOnLowWellbeing, setNotifyOnLowWellbeing] = useState(true);
  const [wellbeingThreshold, setWellbeingThreshold] = useState(5);
  const [notifyOnMissedCheckin, setNotifyOnMissedCheckin] = useState(true);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);

  // Monitoring config state
  const [monitoringConfig, setMonitoringConfig] = useState<{topics: string[], custom_questions: any[]}>({
    topics: [],
    custom_questions: [],
  });

  useEffect(() => {
    if (user && elderId) {
      loadSettings();
    }
  }, [user, elderId]);

  // Check-in method is auto-determined by subscription

  const loadSettings = async () => {
    try {
      // Load elder info (full profile)
      const { data: elder } = await supabase
        .from("elders")
        .select("*")
        .eq("id", elderId)
        .single();

      if (elder) {
        setElderName(elder.full_name);
        setFullName(elder.full_name);
        const ageStr = elder.age?.toString() || "";
        setAge(ageStr);
        setOriginalAge(ageStr);
        setPhoneNumber(elder.phone_number);
        setWhatsappNumber(elder.whatsapp_number || "");
        setEmergencyContact(elder.emergency_contact || "");
        setPreferredLanguage(elder.preferred_language || "english");
        setMedicalConditions(elder.medical_conditions?.join(", ") || "");
        // Load monitoring config
        const config = (elder as any).monitoring_config;
        if (config && typeof config === 'object') {
          setMonitoringConfig({
            topics: config.topics || [],
            custom_questions: config.custom_questions || [],
          });
        }
      }

      // Load schedule
      const { data: schedule } = await supabase
        .from("check_in_schedules")
        .select("*")
        .eq("elder_id", elderId)
        .single();

      if (schedule) {
        setScheduleActive(schedule.active ?? false);
        setScheduleType(schedule.schedule_type as "daily" | "weekly");
        setTimeOfDay(schedule.time_of_day?.slice(0, 5) || "09:00");
        setDaysOfWeek(schedule.days_of_week || [1, 2, 3, 4, 5]);
      }

      // Load notification settings
      const { data: notifications } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("elder_id", elderId)
        .single();

      if (notifications) {
        setNotifyEmail(notifications.notify_email ?? true);
        setEmailAddress(notifications.email_address || "");
        setNotifyOnAlert(notifications.notify_on_alert ?? true);
        setNotifyOnLowWellbeing(notifications.notify_on_low_wellbeing ?? true);
        setWellbeingThreshold(notifications.wellbeing_threshold ?? 5);
        setNotifyOnMissedCheckin(notifications.notify_on_missed_checkin ?? true);
        setWeeklySummaryEnabled(notifications.weekly_summary_enabled ?? true);
      } else {
        // Pre-fill with user's email
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email) {
          setEmailAddress(currentUser.email);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (skipAgeConfirm = false) => {
    if (!fullName || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields (Name and Phone Number)",
        variant: "destructive",
      });
      return;
    }

    // Validate age range
    const parsedAge = age ? parseInt(age) : null;
    if (parsedAge !== null && (parsedAge < 18 || parsedAge > 120)) {
      toast({
        title: "Invalid Age",
        description: "Age must be between 18 and 120 years",
        variant: "destructive",
      });
      return;
    }

    // Check for significant age change
    if (!skipAgeConfirm && originalAge && age) {
      const ageDiff = Math.abs(parseInt(age) - parseInt(originalAge));
      if (ageDiff > 5) {
        setShowAgeConfirm(true);
        return;
      }
    }

    setSaving(true);
    try {
      // Determine check-in method based on subscription
      const autoCheckInMethod = (isTrialActive || tier === "premium") ? "both" : "whatsapp";
      
      // Parse medical conditions
      const conditions = medicalConditions
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);
      
      // Update elder profile + preferences + monitoring config
      await supabase
        .from("elders")
        .update({ 
          full_name: fullName,
          age: age ? parseInt(age) : null,
          phone_number: phoneNumber,
          emergency_contact: emergencyContact || null,
          medical_conditions: conditions.length > 0 ? conditions : null,
          preferred_language: preferredLanguage, 
          check_in_method: autoCheckInMethod,
          whatsapp_number: whatsappNumber || null,
          monitoring_config: monitoringConfig,
        })
        .eq("id", elderId);
      
      // Update local elderName for display
      setElderName(fullName);

      // Check if time_of_day changed - if so, reset last_run_at to allow new call today
      const { data: existingSchedule } = await supabase
        .from("check_in_schedules")
        .select("id, time_of_day")
        .eq("elder_id", elderId)
        .single();
      
      const timeChanged = existingSchedule && existingSchedule.time_of_day?.slice(0, 5) !== timeOfDay;
      
      // Upsert schedule with conditional last_run_at reset
      const scheduleData: any = {
        elder_id: elderId,
        schedule_type: scheduleType,
        time_of_day: timeOfDay,
        days_of_week: daysOfWeek,
        active: scheduleActive,
      };
      
      // Reset last_run_at if time changed to allow call at new time
      if (timeChanged) {
        scheduleData.last_run_at = null;
      }
      
      const { error: scheduleError } = await supabase
        .from("check_in_schedules")
        .upsert(scheduleData, {
          onConflict: "elder_id",
          ignoreDuplicates: false,
        });

      if (scheduleError) {
        if (existingSchedule) {
          const updateData: any = {
            schedule_type: scheduleType,
            time_of_day: timeOfDay,
            days_of_week: daysOfWeek,
            active: scheduleActive,
          };
          if (timeChanged) {
            updateData.last_run_at = null;
          }
          await supabase
            .from("check_in_schedules")
            .update(updateData)
            .eq("elder_id", elderId);
        } else {
          await supabase
            .from("check_in_schedules")
            .insert({
              elder_id: elderId,
              schedule_type: scheduleType,
              time_of_day: timeOfDay,
              days_of_week: daysOfWeek,
              active: scheduleActive,
            });
        }
      }
      
      // Notify user if time changed
      if (timeChanged) {
        toast({
          title: "Schedule Updated",
          description: "Call time changed - a call will be triggered at the new time today.",
        });
      }

      // Upsert notifications
      const { error: notifError } = await supabase
        .from("notification_settings")
        .upsert({
          elder_id: elderId,
          notify_email: notifyEmail,
          email_address: emailAddress || null,
          notify_on_alert: notifyOnAlert,
          notify_on_low_wellbeing: notifyOnLowWellbeing,
          wellbeing_threshold: wellbeingThreshold,
          notify_on_missed_checkin: notifyOnMissedCheckin,
          weekly_summary_enabled: weeklySummaryEnabled,
        }, {
          onConflict: "elder_id",
          ignoreDuplicates: false,
        });

      if (notifError) {
        const { data: existing } = await supabase
          .from("notification_settings")
          .select("id")
          .eq("elder_id", elderId)
          .single();

        if (existing) {
          await supabase
            .from("notification_settings")
            .update({
              notify_email: notifyEmail,
              email_address: emailAddress || null,
              notify_on_alert: notifyOnAlert,
              notify_on_low_wellbeing: notifyOnLowWellbeing,
              wellbeing_threshold: wellbeingThreshold,
              notify_on_missed_checkin: notifyOnMissedCheckin,
              weekly_summary_enabled: weeklySummaryEnabled,
            })
            .eq("elder_id", elderId);
        } else {
          await supabase
            .from("notification_settings")
            .insert({
              elder_id: elderId,
              notify_email: notifyEmail,
              email_address: emailAddress || null,
              notify_on_alert: notifyOnAlert,
              notify_on_low_wellbeing: notifyOnLowWellbeing,
              wellbeing_threshold: wellbeingThreshold,
              notify_on_missed_checkin: notifyOnMissedCheckin,
              weekly_summary_enabled: weeklySummaryEnabled,
            });
        }
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("elders")
        .delete()
        .eq("id", elderId);

      if (error) throw error;

      toast({
        title: "Elder Removed",
        description: "The elder profile has been deleted",
      });
      navigate("/elders");
    } catch (error) {
      console.error("Error deleting elder:", error);
      toast({
        title: "Error",
        description: "Failed to delete elder profile",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/elders")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Elders
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Settings for {elderName}</h1>
              <Badge variant={isTrialActive || tier === "premium" ? "default" : "secondary"}>
                {isTrialActive ? "Premium Trial" : tier === "premium" ? "Premium" : "Basic"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Configure check-in schedules and notifications
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Elder Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Elder Profile</CardTitle>
              </div>
              <CardDescription>
                Update basic information for {elderName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 120)) {
                        setAge(val);
                      }
                    }}
                    placeholder="Enter age"
                    min="18"
                    max="120"
                  />
                  {originalAge && age && Math.abs(parseInt(age) - parseInt(originalAge)) > 5 && (
                    <p className="text-xs text-destructive">
                      ⚠️ Age changed from {originalAge} to {age}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Medical Conditions */}
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Input
                  id="medicalConditions"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="Diabetes, Hypertension, Heart Disease"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple conditions with commas
                </p>
              </div>

              {/* Delete Profile */}
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Elder Profile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Elder Profile</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {elderName}'s profile? This action cannot be undone and will remove all check-in history, health data, and scheduled calls.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Communication Preferences</CardTitle>
              </div>
              <CardDescription>
                Set the language and method for AI check-ins with {elderName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">हिन्दी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The AI will speak and understand this language during check-ins
                </p>
              </div>

              <div className="space-y-3">
                <Label>Your Check-in Features</Label>
                <p className="text-sm text-muted-foreground">
                  Based on your {isTrialActive ? "Premium Trial" : tier === "premium" ? "Premium" : "Basic"} plan
                </p>
                {(isTrialActive || tier === "premium") ? (
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm font-medium">Voice Calls</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-fit">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Voice calls require a Premium plan.{" "}
                        <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/select-plan")}>
                          Upgrade now
                        </Button>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Number - always show since all plans have WhatsApp */}
              <div className="space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp Number
                </Label>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full md:w-[300px]"
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +91 for India, +1 for US)
                </p>
                {!whatsappNumber && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ WhatsApp number is required for check-ins
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Health Monitoring */}
          <HealthMonitoringCard
            config={monitoringConfig}
            onChange={setMonitoringConfig}
            preferredLanguage={preferredLanguage}
          />

          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Check-in Schedule</CardTitle>
              </div>
              <CardDescription>
                Set up automatic check-ins for {elderName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Scheduled Check-ins</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically run check-ins at scheduled times
                  </p>
                </div>
                <Switch
                  checked={scheduleActive}
                  onCheckedChange={setScheduleActive}
                />
              </div>

              {scheduleActive && (
                <>
                  <div className="space-y-2">
                    <Label>Schedule Type</Label>
                    <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as "daily" | "weekly")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time of Day (IST - India Standard Time)</Label>
                    <Input
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map((day) => (
                        <Button
                          key={day.value}
                          variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Configure how you want to be notified about {elderName}'s health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notifyEmail}
                  onCheckedChange={setNotifyEmail}
                />
              </div>

              {notifyEmail && (
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Notify me when:</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Health Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      When AI detects concerning health symptoms
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnAlert}
                    onCheckedChange={setNotifyOnAlert}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Low Well-being Score</Label>
                    <p className="text-sm text-muted-foreground">
                      When well-being score drops below threshold
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnLowWellbeing}
                    onCheckedChange={setNotifyOnLowWellbeing}
                  />
                </div>

                {notifyOnLowWellbeing && (
                  <div className="space-y-2 pl-4 border-l-2">
                    <Label>Well-being Threshold: {wellbeingThreshold}</Label>
                    <Slider
                      value={[wellbeingThreshold]}
                      onValueChange={(v) => setWellbeingThreshold(v[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full max-w-xs"
                    />
                    <p className="text-sm text-muted-foreground">
                      Alert when score falls below {wellbeingThreshold}/10
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Missed Check-ins</Label>
                    <p className="text-sm text-muted-foreground">
                      When a scheduled check-in is missed
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnMissedCheckin}
                    onCheckedChange={setNotifyOnMissedCheckin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Health Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly report every Sunday
                    </p>
                  </div>
                  <Switch
                    checked={weeklySummaryEnabled}
                    onCheckedChange={setWeeklySummaryEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Age Change Confirmation Dialog */}
          <AlertDialog open={showAgeConfirm} onOpenChange={setShowAgeConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Age Change</AlertDialogTitle>
                <AlertDialogDescription>
                  You are changing the age from <strong>{originalAge}</strong> to <strong>{age}</strong>. 
                  This is a significant change. Are you sure this is correct?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAge(originalAge)}>
                  Revert Change
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setShowAgeConfirm(false);
                  saveSettings(true);
                }}>
                  Confirm & Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveSettings()}
              disabled={saving}
              size="lg"
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ElderSettings;
