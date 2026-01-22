import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "./RiskBadge";
import { Eye, Phone, MessageSquare, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface Patient {
  id: string;
  patient_name: string;
  mobile_number: string;
  discharge_date: string;
  ward: string | null;
  doctor_name: string | null;
  diagnosis: string | null;
  risk_status: 'pending' | 'stable' | 'nurse_followup' | 'urgent';
  check_48hr_completed: boolean;
  medicine_day_count: number;
  follow_up_date: string | null;
  status: string;
}

interface PatientTableProps {
  patients: Patient[];
  onViewPatient: (id: string) => void;
  onCallPatient?: (phone: string) => void;
  onMessagePatient?: (id: string) => void;
  loading?: boolean;
}

export const PatientTable = ({
  patients,
  onViewPatient,
  onCallPatient,
  onMessagePatient,
  loading,
}: PatientTableProps) => {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      patient.mobile_number.includes(search);
    const matchesRisk = riskFilter === "all" || patient.risk_status === riskFilter;
    const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Risk Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="nurse_followup">Nurse Follow-up</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Discharge</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Risk Status</TableHead>
              <TableHead>48hr Check</TableHead>
              <TableHead>Day</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading patients...
                </TableCell>
              </TableRow>
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <span className="font-medium">{patient.patient_name}</span>
                      <div className="text-sm text-muted-foreground">
                        {patient.mobile_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(patient.discharge_date), "dd MMM")}
                  </TableCell>
                  <TableCell>{patient.ward || "-"}</TableCell>
                  <TableCell>{patient.doctor_name || "-"}</TableCell>
                  <TableCell>
                    <RiskBadge status={patient.risk_status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {patient.check_48hr_completed ? (
                      <span className="text-green-600">✓ Done</span>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">Day {patient.medicine_day_count}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onViewPatient(patient.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onCallPatient && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onCallPatient(patient.mobile_number)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {onMessagePatient && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onMessagePatient(patient.id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredPatients.length} of {patients.length} patients
      </div>
    </div>
  );
};
