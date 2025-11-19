import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const AddElder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    whatsapp_number: "",
    age: "",
    emergency_contact: "",
    subscription_plan: "basic",
  });
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState("");

  const addCondition = () => {
    if (conditionInput.trim() && !medicalConditions.includes(conditionInput.trim())) {
      setMedicalConditions([...medicalConditions, conditionInput.trim()]);
      setConditionInput("");
    }
  };

  const removeCondition = (condition: string) => {
    setMedicalConditions(medicalConditions.filter((c) => c !== condition));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get profile first
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const { error } = await supabase.from("elders").insert({
        family_member_id: profile.id,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        whatsapp_number: formData.whatsapp_number || null,
        age: formData.age ? parseInt(formData.age) : null,
        emergency_contact: formData.emergency_contact || null,
        medical_conditions: medicalConditions.length > 0 ? medicalConditions : null,
        subscription_plan: formData.subscription_plan,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Elder profile created successfully",
      });
      navigate("/elders");
    } catch (error) {
      console.error("Error creating elder:", error);
      toast({
        title: "Error",
        description: "Failed to create elder profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/elders")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Elders
          </Button>
          <h1 className="text-3xl font-bold">Add Elder Profile</h1>
          <p className="text-muted-foreground mt-1">Create a new elder profile for monitoring</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Elder Information</CardTitle>
            <CardDescription>Enter the details of the person you want to monitor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  required
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="+1234567890 (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Enter age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label>Medical Conditions</Label>
                <div className="flex gap-2">
                  <Input
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                  <Button type="button" onClick={addCondition} variant="outline">
                    Add
                  </Button>
                </div>
                {medicalConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {medicalConditions.map((condition) => (
                      <Badge
                        key={condition}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCondition(condition)}
                      >
                        {condition} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscription_plan">Subscription Plan</Label>
                <select
                  id="subscription_plan"
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="family">Family</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Elder Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/elders")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddElder;
