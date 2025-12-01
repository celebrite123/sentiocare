import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  purpose: string | null;
  active: boolean;
}

const ManageMedicines = () => {
  const navigate = useNavigate();
  const { elderId } = useParams();
  const [elderName, setElderName] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    timing: "",
    purpose: "",
  });

  useEffect(() => {
    loadData();
  }, [elderId]);

  const loadData = async () => {
    try {
      // Load elder info
      const { data: elder } = await supabase
        .from("elders")
        .select("full_name")
        .eq("id", elderId!)
        .single();

      if (elder) {
        setElderName(elder.full_name);
      }

      // Load medicines
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .eq("elder_id", elderId!)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load medicines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("medicines").insert({
        elder_id: elderId!,
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        timing: formData.timing,
        purpose: formData.purpose || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medicine added successfully",
      });

      setFormData({ name: "", dosage: "", frequency: "", timing: "", purpose: "" });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast({
        title: "Error",
        description: "Failed to add medicine",
        variant: "destructive",
      });
    }
  };

  const deleteMedicine = async (id: string) => {
    try {
      const { error } = await supabase
        .from("medicines")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medicine removed",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting medicine:", error);
      toast({
        title: "Error",
        description: "Failed to remove medicine",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30">
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-6">
            <Button variant="ghost" onClick={() => navigate("/elders")} className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Elders
            </Button>
            <h1 className="text-3xl font-bold">Manage Medicines</h1>
            <p className="text-muted-foreground mt-1">
              {elderName ? `For ${elderName}` : "Loading..."}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              {showForm ? "Hide Form" : "Add Medicine"}
            </Button>
          </div>

          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Medicine</CardTitle>
                <CardDescription>Enter medicine details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Medicine Name *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Metformin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dosage">Dosage *</Label>
                      <Input
                        id="dosage"
                        required
                        value={formData.dosage}
                        onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency *</Label>
                      <Input
                        id="frequency"
                        required
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        placeholder="e.g., Twice daily"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timing">Timing *</Label>
                      <Input
                        id="timing"
                        required
                        value={formData.timing}
                        onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                        placeholder="e.g., 8:00 AM, 8:00 PM"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      placeholder="e.g., Blood sugar control"
                    />
                  </div>

                  <Button type="submit">Add Medicine</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {medicines.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">No medicines added yet</p>
                </CardContent>
              </Card>
            ) : (
              medicines.map((medicine) => (
                <Card key={medicine.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{medicine.name}</h3>
                        {medicine.purpose && (
                          <p className="text-sm text-muted-foreground">{medicine.purpose}</p>
                        )}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Dosage</p>
                            <p className="text-sm font-medium">{medicine.dosage}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Frequency</p>
                            <p className="text-sm font-medium">{medicine.frequency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Timing</p>
                            <p className="text-sm font-medium">{medicine.timing}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMedicine(medicine.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageMedicines;
