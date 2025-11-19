import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  purpose: string | null;
}

const MedicineTracker = () => {
  const [searchParams] = useSearchParams();
  const elderId = searchParams.get("elder");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (elderId) {
      loadMedicines();
    }
  }, [elderId]);

  const loadMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .eq("elder_id", elderId!)
        .eq("active", true);

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error("Error loading medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicine Schedule</CardTitle>
        <CardDescription>Current medication routine and compliance</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : medicines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No medicines added yet</p>
          ) : (
            <div className="space-y-4">
              {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{medicine.name}</h4>
                      <p className="text-sm text-muted-foreground">{medicine.purpose || "No purpose specified"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dosage</p>
                    <p className="font-medium">{medicine.dosage}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency</p>
                    <p className="font-medium">{medicine.frequency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timing</p>
                    <p className="font-medium">{medicine.timing}</p>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MedicineTracker;
