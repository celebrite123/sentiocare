import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, MessageSquare, Phone, Bell, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { B2BLayout } from "@/components/b2b/B2BLayout";

const B2BSettings = () => {
  const { organization, member, refetch } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    hospital_contact_number: "",
    default_language: "hindi",
    auto_48hr_check: true,
    auto_medicine_reminders: true,
    discharge_message_template: "",
  });
  const [usage, setUsage] = useState({
    patients_this_month: 0,
    sms_used_this_month: 0,
    calls_used_this_month: 0,
    monthly_patient_limit: 500,
    monthly_sms_limit: 5000,
    monthly_call_limit: 1000,
  });

  useEffect(() => {
    if (organization) {
      setSettings({
        name: organization.name || "",
        contact_email: organization.contact_email || "",
        contact_phone: organization.contact_phone || "",
        hospital_contact_number: organization.hospital_contact_number || "",
        default_language: organization.default_language || "hindi",
        auto_48hr_check: organization.auto_48hr_check ?? true,
        auto_medicine_reminders: organization.auto_medicine_reminders ?? true,
        discharge_message_template: organization.discharge_message_template || "",
      });
      setUsage({
        patients_this_month: organization.patients_this_month || 0,
        sms_used_this_month: organization.sms_used_this_month || 0,
        calls_used_this_month: organization.calls_used_this_month || 0,
        monthly_patient_limit: organization.monthly_patient_limit || 500,
        monthly_sms_limit: organization.monthly_sms_limit || 5000,
        monthly_call_limit: organization.monthly_call_limit || 1000,
      });
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization || member?.role !== "admin") return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: settings.name,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          hospital_contact_number: settings.hospital_contact_number,
          default_language: settings.default_language,
          auto_48hr_check: settings.auto_48hr_check,
          auto_medicine_reminders: settings.auto_medicine_reminders,
          discharge_message_template: settings.discharge_message_template,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({ title: "Settings saved successfully" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = member?.role === "admin";

  return (
    <B2BLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">Configure your organization's preferences</p>
        </div>

        {/* Usage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              Resets on the 1st of each month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Patients</span>
                  <span className="text-sm font-medium">
                    {usage.patients_this_month} / {usage.monthly_patient_limit}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(usage.patients_this_month / usage.monthly_patient_limit) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">SMS/WhatsApp</span>
                  <span className="text-sm font-medium">
                    {usage.sms_used_this_month} / {usage.monthly_sms_limit}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${(usage.sms_used_this_month / usage.monthly_sms_limit) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Voice Calls</span>
                  <span className="text-sm font-medium">
                    {usage.calls_used_this_month} / {usage.monthly_call_limit}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-secondary h-2 rounded-full transition-all"
                    style={{ width: `${(usage.calls_used_this_month / usage.monthly_call_limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospital_contact">Hospital Contact Number</Label>
                <Input
                  id="hospital_contact"
                  value={settings.hospital_contact_number}
                  onChange={(e) => setSettings({ ...settings, hospital_contact_number: e.target.value })}
                  placeholder="+91XXXXXXXXXX"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Shown to patients for emergency contact
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Automation Settings
            </CardTitle>
            <CardDescription>
              Configure automatic patient communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">48-Hour Health Check</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically contact patients 48 hours after discharge
                </p>
              </div>
              <Switch
                checked={settings.auto_48hr_check}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_48hr_check: checked })}
                disabled={!isAdmin}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Daily Medicine Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send medicine reminders for 7 days post-discharge
                </p>
              </div>
              <Switch
                checked={settings.auto_medicine_reminders}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_medicine_reminders: checked })}
                disabled={!isAdmin}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Default Language</Label>
              <div className="flex gap-2">
                {["hindi", "english", "tamil", "telugu", "kannada", "marathi"].map((lang) => (
                  <Badge
                    key={lang}
                    variant={settings.default_language === lang ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => isAdmin && setSettings({ ...settings, default_language: lang })}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discharge Message Template
            </CardTitle>
            <CardDescription>
              Customize the message sent to patients at discharge (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={settings.discharge_message_template}
              onChange={(e) => setSettings({ ...settings, discharge_message_template: e.target.value })}
              placeholder="Leave blank to use default template. Use {patient_name}, {medicines}, {follow_up_date}, {hospital_name}, {hospital_contact} as placeholders."
              rows={6}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Available placeholders: {"{patient_name}"}, {"{medicines}"}, {"{follow_up_date}"}, {"{hospital_name}"}, {"{hospital_contact}"}
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {!isAdmin && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Only organization admins can modify settings
            </CardContent>
          </Card>
        )}
      </div>
    </B2BLayout>
  );
};

export default B2BSettings;
