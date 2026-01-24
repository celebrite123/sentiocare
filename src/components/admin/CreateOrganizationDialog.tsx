import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateOrganizationDialogProps {
  onSuccess: () => void;
  leadData?: {
    id: string;
    organization_name: string;
    organization_type: string;
    contact_email: string;
    contact_phone: string;
    contact_name: string;
  };
  trigger?: React.ReactNode;
}

const CreateOrganizationDialog = ({ onSuccess, leadData, trigger }: CreateOrganizationDialogProps) => {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(leadData?.organization_name || "");
  const [type, setType] = useState(leadData?.organization_type || "hospital");
  const [contactEmail, setContactEmail] = useState(leadData?.contact_email || "");
  const [contactPhone, setContactPhone] = useState(leadData?.contact_phone || "");
  const [address, setAddress] = useState("");
  const [hospitalContactNumber, setHospitalContactNumber] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("hindi");
  const [monthlyPatientLimit, setMonthlyPatientLimit] = useState("500");
  const [monthlySmsLimit, setMonthlySmsLimit] = useState("5000");
  const [monthlyCallLimit, setMonthlyCallLimit] = useState("1000");

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-b2b-organization", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          name: name.trim(),
          type,
          contact_email: contactEmail || undefined,
          contact_phone: contactPhone || undefined,
          address: address || undefined,
          hospital_contact_number: hospitalContactNumber || undefined,
          default_language: defaultLanguage,
          monthly_patient_limit: parseInt(monthlyPatientLimit) || 500,
          monthly_sms_limit: parseInt(monthlySmsLimit) || 5000,
          monthly_call_limit: parseInt(monthlyCallLimit) || 1000,
          lead_id: leadData?.id,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Organization created successfully");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Error creating organization:", err);
      toast.error("Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!leadData) {
      setName("");
      setType("hospital");
      setContactEmail("");
      setContactPhone("");
    }
    setAddress("");
    setHospitalContactNumber("");
    setDefaultLanguage("hindi");
    setMonthlyPatientLimit("500");
    setMonthlySmsLimit("5000");
    setMonthlyCallLimit("1000");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {leadData ? "Convert Lead to Organization" : "Create New Organization"}
          </DialogTitle>
          <DialogDescription>
            {leadData 
              ? `Create organization from lead: ${leadData.contact_name}`
              : "Add a new hospital or healthcare facility to the B2B platform"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="City Hospital"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="nursing_home">Nursing Home</SelectItem>
                  <SelectItem value="assisted_living">Assisted Living</SelectItem>
                  <SelectItem value="home_care">Home Care</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@hospital.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address of the organization"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospitalNumber">Hospital Contact Number</Label>
              <Input
                id="hospitalNumber"
                value={hospitalContactNumber}
                onChange={(e) => setHospitalContactNumber(e.target.value)}
                placeholder="Helpline number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Default Language</Label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <h4 className="font-medium mb-3">Usage Limits (Custom Package)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientLimit">Patients / Month</Label>
                <Input
                  id="patientLimit"
                  type="number"
                  value={monthlyPatientLimit}
                  onChange={(e) => setMonthlyPatientLimit(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smsLimit">SMS / Month</Label>
                <Input
                  id="smsLimit"
                  type="number"
                  value={monthlySmsLimit}
                  onChange={(e) => setMonthlySmsLimit(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callLimit">Calls / Month</Label>
                <Input
                  id="callLimit"
                  type="number"
                  value={monthlyCallLimit}
                  onChange={(e) => setMonthlyCallLimit(e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganizationDialog;