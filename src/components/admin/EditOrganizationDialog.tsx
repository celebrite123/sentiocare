import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Loader2, Building2, Phone, Settings, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  monthly_patient_limit: number;
  monthly_sms_limit: number;
  monthly_call_limit: number;
  patients_this_month: number;
  sms_used_this_month: number;
  calls_used_this_month: number;
  auto_48hr_check: boolean;
  auto_medicine_reminders: boolean;
  hospital_contact_number: string | null;
  escalation_phone: string | null;
  escalation_email: string | null;
  bolna_agent_id: string | null;
  bolna_agent_id_hindi: string | null;
  voice_enabled: boolean;
  default_language: string;
}

interface EditOrganizationDialogProps {
  organization: Organization;
  onSuccess?: () => void;
}

export const EditOrganizationDialog = ({ organization, onSuccess }: EditOrganizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    hospital_contact_number: "",
    escalation_phone: "",
    escalation_email: "",
    monthly_patient_limit: 500,
    monthly_sms_limit: 5000,
    monthly_call_limit: 1000,
    auto_48hr_check: true,
    auto_medicine_reminders: true,
    voice_enabled: true,
    bolna_agent_id: "",
    bolna_agent_id_hindi: "",
    default_language: "hindi",
  });

  useEffect(() => {
    if (open && organization) {
      setFormData({
        name: organization.name || "",
        contact_email: organization.contact_email || "",
        contact_phone: organization.contact_phone || "",
        hospital_contact_number: organization.hospital_contact_number || "",
        escalation_phone: organization.escalation_phone || "",
        escalation_email: organization.escalation_email || "",
        monthly_patient_limit: organization.monthly_patient_limit || 500,
        monthly_sms_limit: organization.monthly_sms_limit || 5000,
        monthly_call_limit: organization.monthly_call_limit || 1000,
        auto_48hr_check: organization.auto_48hr_check ?? true,
        auto_medicine_reminders: organization.auto_medicine_reminders ?? true,
        voice_enabled: organization.voice_enabled ?? true,
        bolna_agent_id: organization.bolna_agent_id || "",
        bolna_agent_id_hindi: organization.bolna_agent_id_hindi || "",
        default_language: organization.default_language || "hindi",
      });
    }
  }, [open, organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("update-b2b-organization", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: {
          organization_id: organization.id,
          updates: {
            name: formData.name,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            hospital_contact_number: formData.hospital_contact_number || null,
            escalation_phone: formData.escalation_phone || null,
            escalation_email: formData.escalation_email || null,
            monthly_patient_limit: formData.monthly_patient_limit,
            monthly_sms_limit: formData.monthly_sms_limit,
            monthly_call_limit: formData.monthly_call_limit,
            auto_48hr_check: formData.auto_48hr_check,
            auto_medicine_reminders: formData.auto_medicine_reminders,
            voice_enabled: formData.voice_enabled,
            bolna_agent_id: formData.bolna_agent_id || null,
            bolna_agent_id_hindi: formData.bolna_agent_id_hindi || null,
            default_language: formData.default_language,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Organization updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast.error(error.message || "Failed to update organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update organization settings, limits, and voice agent configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">
                <Building2 className="h-4 w-4 mr-1" />
                Details
              </TabsTrigger>
              <TabsTrigger value="contact">
                <Phone className="h-4 w-4 mr-1" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="limits">
                <Settings className="h-4 w-4 mr-1" />
                Limits
              </TabsTrigger>
              <TabsTrigger value="voice">
                <Mic className="h-4 w-4 mr-1" />
                Voice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_language">Default Language</Label>
                <select
                  id="default_language"
                  value={formData.default_language}
                  onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                  <option value="marathi">Marathi</option>
                </select>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="hospital_contact_number">Hospital Helpline Number</Label>
                <Input
                  id="hospital_contact_number"
                  value={formData.hospital_contact_number}
                  onChange={(e) => setFormData({ ...formData, hospital_contact_number: e.target.value })}
                  placeholder="1800-XXX-XXXX"
                />
                <p className="text-xs text-muted-foreground">
                  This number is given to patients during emergency escalation
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="escalation_phone">Escalation Phone (Duty Doctor)</Label>
                  <Input
                    id="escalation_phone"
                    value={formData.escalation_phone}
                    onChange={(e) => setFormData({ ...formData, escalation_phone: e.target.value })}
                    placeholder="+919876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="escalation_email">Escalation Email</Label>
                  <Input
                    id="escalation_email"
                    type="email"
                    value={formData.escalation_email}
                    onChange={(e) => setFormData({ ...formData, escalation_email: e.target.value })}
                    placeholder="duty-doctor@hospital.com"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Limits</CardTitle>
                  <CardDescription>Set usage limits for this organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_patient_limit">Patient Limit</Label>
                      <Input
                        id="monthly_patient_limit"
                        type="number"
                        value={formData.monthly_patient_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_patient_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_sms_limit">SMS Limit</Label>
                      <Input
                        id="monthly_sms_limit"
                        type="number"
                        value={formData.monthly_sms_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_sms_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_call_limit">Call Limit</Label>
                      <Input
                        id="monthly_call_limit"
                        type="number"
                        value={formData.monthly_call_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_call_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Automation Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto 48-Hour Check</Label>
                      <p className="text-xs text-muted-foreground">Automatically call patients 48 hours after discharge</p>
                    </div>
                    <Switch
                      checked={formData.auto_48hr_check}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_48hr_check: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Medicine Reminders</Label>
                      <p className="text-xs text-muted-foreground">Send daily medicine reminder messages</p>
                    </div>
                    <Switch
                      checked={formData.auto_medicine_reminders}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_medicine_reminders: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Voice Agent Configuration</CardTitle>
                  <CardDescription>
                    Configure Bolna AI agents for this organization. Leave empty to use global defaults.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Voice Calls</Label>
                      <p className="text-xs text-muted-foreground">Use voice calls for patient check-ins</p>
                    </div>
                    <Switch
                      checked={formData.voice_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, voice_enabled: checked })}
                    />
                  </div>
                  
                  {formData.voice_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bolna_agent_id">Bolna Agent ID (English)</Label>
                        <Input
                          id="bolna_agent_id"
                          value={formData.bolna_agent_id}
                          onChange={(e) => setFormData({ ...formData, bolna_agent_id: e.target.value })}
                          placeholder="Leave empty for global default"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bolna_agent_id_hindi">Bolna Agent ID (Hindi)</Label>
                        <Input
                          id="bolna_agent_id_hindi"
                          value={formData.bolna_agent_id_hindi}
                          onChange={(e) => setFormData({ ...formData, bolna_agent_id_hindi: e.target.value })}
                          placeholder="Leave empty for global default"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
