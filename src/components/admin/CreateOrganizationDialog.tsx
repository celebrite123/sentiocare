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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [bolnaAgentId, setBolnaAgentId] = useState("");
  const [bolnaAgentIdHindi, setBolnaAgentIdHindi] = useState("");

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
          voice_enabled: voiceEnabled,
          bolna_agent_id: bolnaAgentId || undefined,
          bolna_agent_id_hindi: bolnaAgentIdHindi || undefined,
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
    setVoiceEnabled(true);
    setBolnaAgentId("");
    setBolnaAgentIdHindi("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Organization</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Building2 className="h-4 w-4 md:h-5 md:w-5" />
            {leadData ? "Convert Lead" : "Create Organization"}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {leadData 
              ? `From lead: ${leadData.contact_name}`
              : "Add a hospital or healthcare facility"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:gap-4 py-3 md:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="name" className="text-xs md:text-sm">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="City Hospital"
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="type" className="text-xs md:text-sm">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="contactEmail" className="text-xs md:text-sm">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@hospital.com"
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="contactPhone" className="text-xs md:text-sm">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-9 md:h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="address" className="text-xs md:text-sm">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="hospitalNumber" className="text-xs md:text-sm">Hospital Helpline</Label>
              <Input
                id="hospitalNumber"
                value={hospitalContactNumber}
                onChange={(e) => setHospitalContactNumber(e.target.value)}
                placeholder="Helpline number"
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="language" className="text-xs md:text-sm">Default Language</Label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-3 md:pt-4 mt-2">
            <h4 className="font-medium text-sm md:text-base mb-2 md:mb-3">Usage Limits</h4>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="patientLimit" className="text-[10px] md:text-xs">Patients/Month</Label>
                <Input
                  id="patientLimit"
                  type="number"
                  value={monthlyPatientLimit}
                  onChange={(e) => setMonthlyPatientLimit(e.target.value)}
                  min="1"
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="smsLimit" className="text-[10px] md:text-xs">SMS/Month</Label>
                <Input
                  id="smsLimit"
                  type="number"
                  value={monthlySmsLimit}
                  onChange={(e) => setMonthlySmsLimit(e.target.value)}
                  min="1"
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="callLimit" className="text-[10px] md:text-xs">Calls/Month</Label>
                <Input
                  id="callLimit"
                  type="number"
                  value={monthlyCallLimit}
                  onChange={(e) => setMonthlyCallLimit(e.target.value)}
                  min="1"
                  className="h-9 md:h-10 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3 md:pt-4 mt-2">
            <h4 className="font-medium text-sm md:text-base mb-2 md:mb-3 flex items-center gap-2">
              Voice Agent
              <span className="text-[10px] md:text-xs font-normal text-muted-foreground">(Optional)</span>
            </h4>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs md:text-sm">Voice Calls Enabled</Label>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Enable AI voice calls</p>
                </div>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
              {voiceEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="bolnaAgentId" className="text-xs md:text-sm">Bolna Agent (English)</Label>
                    <Input
                      id="bolnaAgentId"
                      value={bolnaAgentId}
                      onChange={(e) => setBolnaAgentId(e.target.value)}
                      placeholder="agent_xxxxxx"
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="bolnaAgentIdHindi" className="text-xs md:text-sm">Bolna Agent (Hindi)</Label>
                    <Input
                      id="bolnaAgentIdHindi"
                      value={bolnaAgentIdHindi}
                      onChange={(e) => setBolnaAgentIdHindi(e.target.value)}
                      placeholder="agent_xxxxxx"
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} size="sm">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganizationDialog;