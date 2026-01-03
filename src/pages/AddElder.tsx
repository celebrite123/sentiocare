import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, User, Phone, Heart, Pill, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    phone_number: "",
    whatsapp_number: "",
    emergency_contact: "",
    subscription_plan: "premium",
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
        return formData.phone_number.trim();
      case 3:
        return true; // Medical conditions are optional
      case 4:
        return true; // Medicines are optional
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
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Create profile if it doesn't exist
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
          subscription_plan: formData.subscription_plan,
          preferred_language: formData.preferred_language,
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
              <p className="text-muted-foreground mt-2">How can we reach {formData.full_name}?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1234567890"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp Number (Optional)</Label>
                <Input
                  id="whatsapp_number"
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+1234567890"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact (Optional)</Label>
                <Input
                  id="emergency_contact"
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="+1234567890"
                  className="text-lg"
                />
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
                  <select
                    id="med_frequency"
                    value={currentMedicine.frequency}
                    onChange={(e) =>
                      setCurrentMedicine({ ...currentMedicine, frequency: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="once_daily">Once Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="thrice_daily">Three Times Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med_timing">Timing</Label>
                  <select
                    id="med_timing"
                    value={currentMedicine.timing}
                    onChange={(e) =>
                      setCurrentMedicine({ ...currentMedicine, timing: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="with_meals">With Meals</option>
                    <option value="before_meals">Before Meals</option>
                  </select>
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
