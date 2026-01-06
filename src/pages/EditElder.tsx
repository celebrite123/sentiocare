import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";

interface Elder {
  id: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string | null;
  age: number | null;
  medical_conditions: string[] | null;
  preferred_language: string;
  emergency_contact: string | null;
}

const EditElder = () => {
  const { elderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [elder, setElder] = useState<Elder | null>(null);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("english");
  const [medicalConditions, setMedicalConditions] = useState("");

  useEffect(() => {
    if (elderId) {
      loadElder();
    }
  }, [elderId]);

  const loadElder = async () => {
    try {
      const { data, error } = await supabase
        .from("elders")
        .select("*")
        .eq("id", elderId)
        .single();

      if (error) throw error;
      
      setElder(data);
      setFullName(data.full_name);
      setAge(data.age?.toString() || "");
      setPhoneNumber(data.phone_number);
      setWhatsappNumber(data.whatsapp_number || "");
      setEmergencyContact(data.emergency_contact || "");
      setPreferredLanguage(data.preferred_language || "english");
      setMedicalConditions(data.medical_conditions?.join(", ") || "");
    } catch (error) {
      console.error("Error loading elder:", error);
      toast({
        title: "Error",
        description: "Failed to load elder data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const conditions = medicalConditions
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const { error } = await supabase
        .from("elders")
        .update({
          full_name: fullName,
          age: age ? parseInt(age) : null,
          phone_number: phoneNumber,
          whatsapp_number: whatsappNumber || null,
          emergency_contact: emergencyContact || null,
          preferred_language: preferredLanguage,
          medical_conditions: conditions.length > 0 ? conditions : null,
        })
        .eq("id", elderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Elder profile updated successfully",
      });
      navigate("/elders");
    } catch (error) {
      console.error("Error updating elder:", error);
      toast({
        title: "Error",
        description: "Failed to update elder profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  if (!elder) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Elder not found</p>
              <Button className="mt-4" onClick={() => navigate("/elders")}>
                Go to Elders
              </Button>
            </CardContent>
          </Card>
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/elders")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Elder Profile</h1>
                <p className="text-muted-foreground">Update information for {elder.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Elder Information</CardTitle>
              <CardDescription>Edit the details below to update the profile</CardDescription>
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
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age"
                    min="1"
                    max="120"
                  />
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
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
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

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Elder Profile</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {elder.full_name}'s profile? This action cannot be undone and will remove all check-in history, health data, and scheduled calls.
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
        </div>
      </div>
    </>
  );
};

export default EditElder;
