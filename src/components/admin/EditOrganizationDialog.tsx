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
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Edit Organization</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Update settings, limits, and voice agent configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9 md:h-10">
              <TabsTrigger value="details" className="text-xs md:text-sm px-1 md:px-3">
                <Building2 className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs md:text-sm px-1 md:px-3">
                <Phone className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Contact</span>
              </TabsTrigger>
              <TabsTrigger value="limits" className="text-xs md:text-sm px-1 md:px-3">
                <Settings className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Limits</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="text-xs md:text-sm px-1 md:px-3">
                <Mic className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Voice</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="name" className="text-xs md:text-sm">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="contact_email" className="text-xs md:text-sm">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="contact_phone" className="text-xs md:text-sm">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="default_language" className="text-xs md:text-sm">Default Language</Label>
                <select
                  id="default_language"
                  value={formData.default_language}
                  onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 h-9 md:h-10 text-sm bg-background"
                >
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                  <option value="tamil">Tamil</option>
                  <option value="telugu">Telugu</option>
                  <option value="marathi">Marathi</option>
                </select>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="hospital_contact_number" className="text-xs md:text-sm">Hospital Helpline</Label>
                <Input
                  id="hospital_contact_number"
                  value={formData.hospital_contact_number}
                  onChange={(e) => setFormData({ ...formData, hospital_contact_number: e.target.value })}
                  placeholder="1800-XXX-XXXX"
                  className="h-9 md:h-10 text-sm"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Given to patients during escalation
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="escalation_phone" className="text-xs md:text-sm">Escalation Phone</Label>
                  <Input
                    id="escalation_phone"
                    value={formData.escalation_phone}
                    onChange={(e) => setFormData({ ...formData, escalation_phone: e.target.value })}
                    placeholder="+919876543210"
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="escalation_email" className="text-xs md:text-sm">Escalation Email</Label>
                  <Input
                    id="escalation_email"
                    type="email"
                    value={formData.escalation_email}
                    onChange={(e) => setFormData({ ...formData, escalation_email: e.target.value })}
                    placeholder="duty@hospital.com"
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
              <Card className="p-0">
                <CardHeader className="p-3 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Monthly Limits</CardTitle>
                  <CardDescription className="text-[10px] md:text-xs">Set usage limits</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3 md:space-y-4">
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="monthly_patient_limit" className="text-[10px] md:text-xs">Patients</Label>
                      <Input
                        id="monthly_patient_limit"
                        type="number"
                        value={formData.monthly_patient_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_patient_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="h-8 md:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="monthly_sms_limit" className="text-[10px] md:text-xs">SMS</Label>
                      <Input
                        id="monthly_sms_limit"
                        type="number"
                        value={formData.monthly_sms_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_sms_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="h-8 md:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="monthly_call_limit" className="text-[10px] md:text-xs">Calls</Label>
                      <Input
                        id="monthly_call_limit"
                        type="number"
                        value={formData.monthly_call_limit}
                        onChange={(e) => setFormData({ ...formData, monthly_call_limit: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="h-8 md:h-10 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-0">
                <CardHeader className="p-3 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Automation</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs md:text-sm">Auto 48-Hour Check</Label>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Call patients 48hr after discharge</p>
                    </div>
                    <Switch
                      checked={formData.auto_48hr_check}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_48hr_check: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs md:text-sm">Medicine Reminders</Label>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Daily reminder messages</p>
                    </div>
                    <Switch
                      checked={formData.auto_medicine_reminders}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_medicine_reminders: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
              <Card className="p-0">
                <CardHeader className="p-3 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Voice Agent</CardTitle>
                  <CardDescription className="text-[10px] md:text-xs">
                    Configure Bolna AI agents. Leave empty for defaults.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs md:text-sm">Enable Voice Calls</Label>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Use voice for check-ins</p>
                    </div>
                    <Switch
                      checked={formData.voice_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, voice_enabled: checked })}
                    />
                  </div>
                  
                  {formData.voice_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="bolna_agent_id" className="text-xs md:text-sm">Bolna Agent (EN)</Label>
                        <Input
                          id="bolna_agent_id"
                          value={formData.bolna_agent_id}
                          onChange={(e) => setFormData({ ...formData, bolna_agent_id: e.target.value })}
                          placeholder="Empty = default"
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="bolna_agent_id_hindi" className="text-xs md:text-sm">Bolna Agent (HI)</Label>
                        <Input
                          id="bolna_agent_id_hindi"
                          value={formData.bolna_agent_id_hindi}
                          onChange={(e) => setFormData({ ...formData, bolna_agent_id_hindi: e.target.value })}
                          placeholder="Empty = default"
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 md:mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="sm">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
