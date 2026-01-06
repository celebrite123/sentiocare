import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, User, Phone, Heart, Pill, Globe, MessageCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const AddElder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, canUseVoice, isTrialActive } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    phone_number: "",
    whatsapp_number: "",
    emergency_contact: "",
    preferred_language: "english",
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

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name.trim() && formData.age;
      case 2:
        return formData.phone_number.trim() && formData.whatsapp_number.trim();
      case 3:
        return true;
      case 4:
        return true;
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

      // Determine check-in method based on tier
      const subscriptionPlan = profile?.subscription_tier || tier || "basic";
      const checkInMethod = canUseVoice ? "both" : "whatsapp";

      // Insert elder
      const { data: elder, error: elderError } = await supabase
        .from("elders")
        .insert({
          family_member_id: profile.id,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          whatsapp_number: formData.whatsapp_number || null,
          age: formData.age ? parseInt(formData.age) : null,
          emergency_contact: formData.emergency_contact || null,
          medical_conditions: medicalConditions.length > 0 ? medicalConditions : null,
          subscription_plan: subscriptionPlan,
          preferred_language: formData.preferred_language,
          check_in_method: checkInMethod,
        })
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

      // Create default notification settings
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase
        .from("notification_settings")
        .insert({
          elder_id: elder.id,
          notify_email: true,
          email_address: currentUser?.email || null,
          notify_on_alert: true,
          notify_on_low_wellbeing: true,
          wellbeing_threshold: 5,
          notify_on_missed_checkin: true,
        });

      toast({
        title: "Success! 🎉",
        description: `${formData.full_name}'s profile has been created`,
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
              <h2 className="text-2xl font-bold">Contact Details</h2>
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

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact (Optional)</Label>
                <Input
                  id="emergency_contact"
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-lg"
                />
              </div>

              {/* Show plan info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={tier === "premium" ? "default" : "secondary"}>
                    {tier === "premium" ? "Premium" : "Basic"} Plan
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

      case 4:
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
                      <SelectItem value="with_meals">With Meals</SelectItem>
                      <SelectItem value="before_meals">Before Meals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
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
              </div>

              <Button
                type="button"
                onClick={addMedicine}
                variant="outline"
                className="w-full"
                disabled={!currentMedicine.name || !currentMedicine.dosage}
              >
                Add Medicine
              </Button>

              {medicines.length > 0 && (
                <div className="space-y-3">
                  <Label>Added Medicines</Label>
                  <div className="space-y-2">
                    {medicines.map((med, index) => (
                      <div
                        key={index}
                        className="p-4 bg-muted/50 rounded-lg flex justify-between items-start"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} • {med.frequency.replace(/_/g, " ")} • {med.timing}
                          </p>
                          {med.purpose && (
                            <p className="text-sm text-muted-foreground italic">{med.purpose}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicine(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {medicines.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No medicines added yet. You can skip this step and add them later.
                </p>
              )}
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                navigate("/elders");
              }
            }}
            className="gap-2 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {step > 1 ? "Previous Step" : "Back to Elders"}
          </Button>

          <div className="max-w-3xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Step {step} of {totalSteps}
                </span>
                <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}% Complete</span>
              </div>
              <Progress value={(step / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between mb-12">
              {[
                { num: 1, label: "Basic Info", icon: User },
                { num: 2, label: "Contact", icon: Phone },
                { num: 3, label: "Health", icon: Heart },
                { num: 4, label: "Medicines", icon: Pill },
              ].map((item) => (
                <div key={item.num} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      step >= item.num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > item.num ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <item.icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <Card className="border-2">
              <CardContent className="p-8">{renderStepContent()}</CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step < totalSteps ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex-1"
                  size="lg"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? "Creating Profile..." : "Create Elder Profile"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddElder;
