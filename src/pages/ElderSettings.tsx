import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Bell, Save, Loader2, Globe, Phone, MessageCircle, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

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
  const [elderName, setElderName] = useState("");

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

  useEffect(() => {
    if (user && elderId) {
      loadSettings();
    }
  }, [user, elderId]);

  // Check-in method is auto-determined by subscription

  const loadSettings = async () => {
    try {
      // Load elder info
      const { data: elder } = await supabase
        .from("elders")
        .select("full_name, preferred_language, check_in_method, whatsapp_number")
        .eq("id", elderId)
        .single();

      if (elder) {
        setElderName(elder.full_name);
        setPreferredLanguage(elder.preferred_language || "english");
        setWhatsappNumber(elder.whatsapp_number || "");
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

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Determine check-in method based on subscription
      const autoCheckInMethod = (isTrialActive || tier === "premium") ? "both" : "whatsapp";
      
      // Update elder preferences
      await supabase
        .from("elders")
        .update({ 
          preferred_language: preferredLanguage, 
          check_in_method: autoCheckInMethod,
          whatsapp_number: whatsappNumber || null
        })
        .eq("id", elderId);

      // Upsert schedule
      const { error: scheduleError } = await supabase
        .from("check_in_schedules")
        .upsert({
          elder_id: elderId,
          schedule_type: scheduleType,
          time_of_day: timeOfDay,
          days_of_week: daysOfWeek,
          active: scheduleActive,
        }, {
          onConflict: "elder_id",
          ignoreDuplicates: false,
        });

      if (scheduleError) {
        const { data: existing } = await supabase
          .from("check_in_schedules")
          .select("id")
          .eq("elder_id", elderId)
          .single();

        if (existing) {
          await supabase
            .from("check_in_schedules")
            .update({
              schedule_type: scheduleType,
              time_of_day: timeOfDay,
              days_of_week: daysOfWeek,
              active: scheduleActive,
            })
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
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
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
