import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent } from "@/components/ui/card";

interface AddStaffDialogProps {
  organizationId: string;
  organizationName: string;
  onSuccess: () => void;
}

interface Credentials {
  email: string;
  temporary_password: string;
  login_url: string;
}

const AddStaffDialog = ({ organizationId, organizationName, onSuccess }: AddStaffDialogProps) => {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "staff" | "nurse">("staff");
  const [canUploadPatients, setCanUploadPatients] = useState(true);
  const [canViewReports, setCanViewReports] = useState(true);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(password);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-b2b-staff", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          organization_id: organizationId,
          staff: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone || undefined,
            role,
            can_upload_patients: canUploadPatients,
            can_view_reports: canViewReports,
            can_manage_staff: canManageStaff || role === "admin",
          },
          temporary_password: temporaryPassword,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Staff member created successfully");
      setCredentials(data.credentials);
      onSuccess();
    } catch (err) {
      console.error("Error creating staff:", err);
      toast.error("Failed to create staff member");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    
    const text = `
Login Credentials for ${organizationName}
-----------------------------------------
Email: ${credentials.email}
Password: ${credentials.temporary_password}
Login URL: ${credentials.login_url}

Please change your password after first login.
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Credentials copied to clipboard");
  };

  const handleClose = () => {
    setOpen(false);
    setCredentials(null);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("staff");
    setCanUploadPatients(true);
    setCanViewReports(true);
    setCanManageStaff(false);
    setTemporaryPassword("");
  };

  // When role changes, update permissions
  const handleRoleChange = (newRole: "admin" | "staff" | "nurse") => {
    setRole(newRole);
    if (newRole === "admin") {
      setCanUploadPatients(true);
      setCanViewReports(true);
      setCanManageStaff(true);
    } else if (newRole === "nurse") {
      setCanUploadPatients(false);
      setCanViewReports(true);
      setCanManageStaff(false);
    } else {
      setCanUploadPatients(true);
      setCanViewReports(true);
      setCanManageStaff(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Add a new staff member to {organizationName}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="py-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3 text-primary">Login Credentials Created</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono">{credentials.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <span className="font-mono">{credentials.temporary_password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Login URL:</span>
                    <span className="font-mono text-xs">/b2b/login</span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline" 
                  onClick={copyCredentials}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy Credentials"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Share these credentials securely with the staff member
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffName">Full Name *</Label>
              <Input
                id="staffName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email *</Label>
              <Input
                id="staffEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@hospital.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffPhone">Phone</Label>
              <Input
                id="staffPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffRole">Role *</Label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v as "admin" | "staff" | "nurse")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  <SelectItem value="staff">Staff (Upload & Reports)</SelectItem>
                  <SelectItem value="nurse">Nurse (Alerts & Calls)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="canUpload" className="font-normal text-sm">Can upload patients</Label>
                <Switch
                  id="canUpload"
                  checked={canUploadPatients}
                  onCheckedChange={setCanUploadPatients}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="canReports" className="font-normal text-sm">Can view reports</Label>
                <Switch
                  id="canReports"
                  checked={canViewReports}
                  onCheckedChange={setCanViewReports}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="canManage" className="font-normal text-sm">Can manage staff</Label>
                <Switch
                  id="canManage"
                  checked={canManageStaff}
                  onCheckedChange={setCanManageStaff}
                  disabled={role === "admin"}
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Temporary Password *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
              <Input
                id="password"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {credentials ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Staff
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffDialog;