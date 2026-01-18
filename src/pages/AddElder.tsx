import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, User, Phone, Heart, Pill, Globe, MessageCircle, Users, Calendar, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Progress } from "@/components/ui/progress";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  purpose: string;
}

interface CaregiverData {
  name: string;
  phone: string;
  relation: string;
  notifyEmail: boolean;
  notifySms: boolean;
}

interface ScheduleData {
  timeOfDay: string;
  daysOfWeek: number[];
}

interface CustomQuestion {
  id: string;
  question: string;
  type: "yes_no" | "scale" | "open";
}

interface MonitoringConfig {
  topics: string[];
  custom_questions: CustomQuestion[];
}

const PREDEFINED_TOPICS = [
  { id: "blood_pressure", label: "Blood Pressure", labelHi: "ब्लड प्रेशर", category: "health" },
  { id: "blood_sugar", label: "Blood Sugar", labelHi: "शुगर लेवल", category: "health" },
  { id: "meals", label: "Meals (3x daily)", labelHi: "खाना", category: "lifestyle" },
  { id: "sleep_quality", label: "Sleep Quality", labelHi: "नींद", category: "lifestyle" },
  { id: "water_intake", label: "Water Intake", labelHi: "पानी", category: "lifestyle" },
  { id: "mood", label: "Mood/Feeling", labelHi: "मूड", category: "mental" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const AddElder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, canUseVoice, isTrialActive, canAddElder, elderCount, maxElders, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig>({
    topics: ["meals", "sleep_quality"], // Default recommended topics
    custom_questions: [],
  });

  // Redirect if user already has max elders
  useEffect(() => {
    if (!subscriptionLoading && !canAddElder) {
      toast({
        title: "Elder Limit Reached",
        description: `Your plan includes ${maxElders} elder. You already have ${elderCount} elder(s) registered.`,
        variant: "destructive",
      });
      navigate("/elders");
    }
  }, [subscriptionLoading, canAddElder, elderCount, maxElders, navigate]);

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    phone_number: "",
    whatsapp_number: "",
    preferred_language: "english",
  });

  const [caregiverData, setCaregiverData] = useState<CaregiverData>({
    name: "",
    phone: "",
    relation: "",
    notifyEmail: true,
    notifySms: false,
  });

  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    timeOfDay: "09:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days selected by default
  });

  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState("");

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [currentMedicine, setCurrentMedicine] = useState<Medicine>({
    name: "",
    dosage: "",
    frequency: "once_daily",
    timing: "morning",
    purpose: "",
  });

  // Auto-fill WhatsApp number when phone number changes
  useEffect(() => {
    if (formData.phone_number && !formData.whatsapp_number) {
      setFormData(prev => ({ ...prev, whatsapp_number: prev.phone_number }));
    }
  }, [formData.phone_number]);

  const addCondition = () => {
    if (conditionInput.trim() && !medicalConditions.includes(conditionInput.trim())) {
      setMedicalConditions([...medicalConditions, conditionInput.trim()]);
      setConditionInput("");
    }
  };

  const removeCondition = (condition: string) => {
    setMedicalConditions(medicalConditions.filter((c) => c !== condition));
  };

  const addMedicine = () => {
    if (currentMedicine.name.trim() && currentMedicine.dosage.trim()) {
      setMedicines([...medicines, currentMedicine]);
      setCurrentMedicine({
        name: "",
        dosage: "",
        frequency: "once_daily",
        timing: "morning",
        purpose: "",
      });
    }
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    setScheduleData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name.trim() && formData.age;
      case 2:
        return formData.phone_number.trim() && formData.whatsapp_number.trim();
      case 3:
        return caregiverData.name.trim() && caregiverData.phone.trim() && caregiverData.relation;
      case 4:
        return scheduleData.daysOfWeek.length > 0;
      case 5:
        return true; // Medical conditions are optional
      case 6:
        return true; // Medicines are optional
      case 7:
        return true; // Monitoring is optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Get or create profile
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, subscription_tier")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: user!.id,
            full_name: user!.user_metadata?.full_name || "User",
            phone_number: formData.phone_number,
          })
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;
      }

      // Map profile tier to elder subscription_plan (constraint allows 'whatsapp' or 'premium')
      const profileTier = profile?.subscription_tier || tier || "basic";
      const subscriptionPlan = profileTier === "premium" ? "premium" : "whatsapp";
      const checkInMethod = canUseVoice ? "both" : "whatsapp";

      // Insert elder with monitoring config
      const elderData = {
        family_member_id: profile.id,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        whatsapp_number: formData.whatsapp_number || null,
        age: formData.age ? parseInt(formData.age) : null,
        emergency_contact: caregiverData.phone || null,
        medical_conditions: medicalConditions.length > 0 ? medicalConditions : null,
        subscription_plan: subscriptionPlan,
        preferred_language: formData.preferred_language,
        check_in_method: checkInMethod,
        monitoring_config: monitoringConfig,
      };
      
      const { data: elder, error: elderError } = await supabase
        .from("elders")
        .insert(elderData as any)
        .select()
        .single();

      if (elderError) throw elderError;

      // Insert medicines if any
      if (medicines.length > 0 && elder) {
        const medicineRecords = medicines.map((med) => ({
          elder_id: elder.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          timing: med.timing,
          purpose: med.purpose || null,
        }));

        const { error: medicineError } = await supabase
          .from("medicines")
          .insert(medicineRecords);

        if (medicineError) throw medicineError;
      }

      // Create notification settings with caregiver details
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase
        .from("notification_settings")
        .insert({
          elder_id: elder.id,
          notify_email: caregiverData.notifyEmail,
          email_address: currentUser?.email || null,
          notify_on_alert: true,
          notify_on_low_wellbeing: true,
          wellbeing_threshold: 5,
          notify_on_missed_checkin: true,
          caregiver_name: caregiverData.name,
          caregiver_phone: caregiverData.phone,
          caregiver_relation: caregiverData.relation,
          notify_sms: caregiverData.notifySms,
        });

      // Create check-in schedule
      await supabase
        .from("check_in_schedules")
        .insert({
          elder_id: elder.id,
          schedule_type: checkInMethod,
          time_of_day: scheduleData.timeOfDay,
          days_of_week: scheduleData.daysOfWeek,
          active: true,
        });

      toast({
        title: "Success! 🎉",
        description: `${formData.full_name}'s profile has been created with scheduled check-ins`,
      });
      navigate("/elders");
    } catch (error: any) {
      console.error("Error creating elder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create elder profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Basic Information</h2>
              <p className="text-muted-foreground mt-2">Let's start with the basics</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Enter age"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Preferred Language
                </Label>
                <Select
                  value={formData.preferred_language}
                  onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">हिन्दी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  AI will communicate in this language during check-ins
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Elder's Contact</h2>
              <p className="text-muted-foreground mt-2">How can we reach {formData.full_name || "them"}?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +91 for India)
                </p>
              </div>

              <div className="space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <Label htmlFor="whatsapp_number" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp Number *
                </Label>
                <Input
                  id="whatsapp_number"
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Required for WhatsApp check-ins. Usually same as phone number.
                </p>
              </div>

              {/* Show plan info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={canUseVoice ? "default" : "secondary"}>
                    {isTrialActive ? "Premium Trial" : tier === "premium" ? "Premium" : "Basic"} Plan
                  </Badge>
                  {isTrialActive && (
                    <Badge variant="outline">Trial Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {canUseVoice 
                    ? "✓ Voice calls + WhatsApp check-ins enabled"
                    : "✓ WhatsApp check-ins enabled"}
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Caregiver Details</h2>
              <p className="text-muted-foreground mt-2">Who should we notify in case of emergencies?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caregiver_name">Caregiver Name *</Label>
                <Input
                  id="caregiver_name"
                  value={caregiverData.name}
                  onChange={(e) => setCaregiverData({ ...caregiverData, name: e.target.value })}
                  placeholder="Enter caregiver's full name"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caregiver_phone">Caregiver Phone *</Label>
                <Input
                  id="caregiver_phone"
                  type="tel"
                  value={caregiverData.phone}
                  onChange={(e) => setCaregiverData({ ...caregiverData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  This number will be contacted for missed medications or emergencies
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caregiver_relation">Relation to Elder *</Label>
                <Select
                  value={caregiverData.relation}
                  onValueChange={(value) => setCaregiverData({ ...caregiverData, relation: value })}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="son">Son</SelectItem>
                    <SelectItem value="daughter">Daughter</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="grandchild">Grandchild</SelectItem>
                    <SelectItem value="caretaker">Professional Caretaker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <Label className="text-base font-medium">Notification Preferences</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_email"
                    checked={caregiverData.notifyEmail}
                    onCheckedChange={(checked) => 
                      setCaregiverData({ ...caregiverData, notifyEmail: checked as boolean })
                    }
                  />
                  <label htmlFor="notify_email" className="text-sm">
                    Email notifications
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_sms"
                    checked={caregiverData.notifySms}
                    onCheckedChange={(checked) => 
                      setCaregiverData({ ...caregiverData, notifySms: checked as boolean })
                    }
                  />
                  <label htmlFor="notify_sms" className="text-sm">
                    SMS notifications (for urgent alerts)
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Check-in Schedule</h2>
              <p className="text-muted-foreground mt-2">When should we check in on {formData.full_name || "them"}?</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Preferred Check-in Time *</Label>
                <Input
                  id="check_in_time"
                  type="time"
                  value={scheduleData.timeOfDay}
                  onChange={(e) => setScheduleData({ ...scheduleData, timeOfDay: e.target.value })}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  The AI will call/message at this time
                </p>
              </div>

              <div className="space-y-3">
                <Label>Days of Week *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={scheduleData.daysOfWeek.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                      className="w-12"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which days the check-in should occur
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Check-in Method</p>
                <p className="text-sm text-muted-foreground">
                  {canUseVoice 
                    ? "✓ AI voice calls + WhatsApp messages"
                    : "✓ WhatsApp messages only"}
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Health Information</h2>
              <p className="text-muted-foreground mt-2">Help us understand their health better</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Medical Conditions (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCondition();
                      }
                    }}
                    placeholder="e.g., Diabetes, Hypertension"
                    className="text-lg"
                  />
                  <Button type="button" onClick={addCondition} variant="outline">
                    Add
                  </Button>
                </div>
                {medicalConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-4 bg-muted/50 rounded-lg">
                    {medicalConditions.map((condition) => (
                      <Badge
                        key={condition}
                        variant="secondary"
                        className="cursor-pointer text-base px-3 py-1"
                        onClick={() => removeCondition(condition)}
                      >
                        {condition} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  The AI will ask about these conditions during check-ins
                </p>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Pill className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Medications</h2>
              <p className="text-muted-foreground mt-2">Add any medications they take regularly</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="med_name">Medicine Name</Label>
                  <Input
                    id="med_name"
                    value={currentMedicine.name}
                    onChange={(e) =>
                      setCurrentMedicine({ ...currentMedicine, name: e.target.value })
                    }
                    placeholder="e.g., Aspirin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med_dosage">Dosage</Label>
                  <Input
                    id="med_dosage"
                    value={currentMedicine.dosage}
                    onChange={(e) =>
                      setCurrentMedicine({ ...currentMedicine, dosage: e.target.value })
                    }
                    placeholder="e.g., 100mg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med_frequency">Frequency</Label>
                  <Select
                    value={currentMedicine.frequency}
                    onValueChange={(value) =>
                      setCurrentMedicine({ ...currentMedicine, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once_daily">Once Daily</SelectItem>
                      <SelectItem value="twice_daily">Twice Daily</SelectItem>
                      <SelectItem value="thrice_daily">Three Times Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="as_needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med_timing">Timing</Label>
                  <Select
                    value={currentMedicine.timing}
                    onValueChange={(value) =>
                      setCurrentMedicine({ ...currentMedicine, timing: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="with_food">With Food</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="med_purpose">Purpose (Optional)</Label>
                <Input
                  id="med_purpose"
                  value={currentMedicine.purpose}
                  onChange={(e) =>
                    setCurrentMedicine({ ...currentMedicine, purpose: e.target.value })
                  }
                  placeholder="e.g., Blood pressure control"
                />
              </div>

              <Button
                type="button"
                onClick={addMedicine}
                className="w-full"
                disabled={!currentMedicine.name.trim() || !currentMedicine.dosage.trim()}
              >
                Add Medicine
              </Button>

              {medicines.length > 0 && (
                <div className="space-y-3">
                  <Label>Added Medicines</Label>
                  {medicines.map((med, index) => (
                    <Card key={index}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} • {med.timing} • {med.frequency.replace("_", " ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicine(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Health Monitoring</h2>
              <p className="text-muted-foreground mt-2">What should the AI ask about during check-ins?</p>
            </div>

            <div className="space-y-6">
              {/* Quick Topics */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Topics to Monitor</Label>
                <p className="text-sm text-muted-foreground">
                  Select what the AI should ask about (recommended: Meals & Sleep)
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TOPICS.map((topic) => {
                    const isSelected = monitoringConfig.topics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          const newTopics = isSelected
                            ? monitoringConfig.topics.filter(t => t !== topic.id)
                            : [...monitoringConfig.topics, topic.id];
                          setMonitoringConfig({ ...monitoringConfig, topics: newTopics });
                        }}
                        className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {formData.preferred_language === "hindi" ? topic.labelHi : topic.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              {monitoringConfig.topics.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">During check-ins, the AI will ask about:</p>
                  <p className="text-sm text-muted-foreground">
                    Medicines + {monitoringConfig.topics.map(t => 
                      PREDEFINED_TOPICS.find(pt => pt.id === t)?.label || t
                    ).join(", ")}
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                💡 You can add custom questions later from Elder Settings
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/elders")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Elders
          </Button>

          <div className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <Progress value={(step / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i + 1 === step
                      ? "bg-primary text-primary-foreground"
                      : i + 1 < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
              ))}
            </div>

            {/* Form Content */}
            <Card>
              <CardContent className="p-6 md:p-8">
                {renderStepContent()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                  >
                    Previous
                  </Button>

                  {step < totalSteps ? (
                    <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !canProceed()}
                      className="bg-gradient-primary"
                    >
                      {loading ? "Creating..." : "Create Profile"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddElder;
