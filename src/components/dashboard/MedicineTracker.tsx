import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const medicines = [
  {
    id: 1,
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    time: "8:00 AM, 8:00 PM",
    status: "taken",
    lastTaken: "2 hours ago",
    purpose: "Blood sugar control",
  },
  {
    id: 2,
    name: "Amlodipine",
    dosage: "5mg",
    frequency: "Once daily",
    time: "8:00 AM",
    status: "taken",
    lastTaken: "2 hours ago",
    purpose: "Blood pressure",
  },
  {
    id: 3,
    name: "Atorvastatin",
    dosage: "10mg",
    frequency: "Once daily",
    time: "9:00 PM",
    status: "scheduled",
    lastTaken: "Yesterday",
    purpose: "Cholesterol management",
  },
];

const MedicineTracker = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicine Schedule</CardTitle>
        <CardDescription>Current medication routine and compliance</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        medicine.status === "taken"
                          ? "bg-success/10"
                          : "bg-warning/10"
                      }`}
                    >
                      {medicine.status === "taken" ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{medicine.name}</h4>
                      <p className="text-sm text-muted-foreground">{medicine.purpose}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      medicine.status === "taken"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {medicine.status === "taken" ? "Taken" : "Scheduled"}
                  </Badge>
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
                    <p className="font-medium">{medicine.time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Taken</p>
                    <p className="font-medium">{medicine.lastTaken}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MedicineTracker;
