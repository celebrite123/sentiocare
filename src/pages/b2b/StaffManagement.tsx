import { useState, useEffect } from "react";
import { B2BLayout } from "@/components/b2b/B2BLayout";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Users,
  MoreVertical,
  Shield,
  Upload,
  BarChart,
  Mail,
  Phone,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  can_upload_patients: boolean;
  can_view_reports: boolean;
  can_manage_staff: boolean;
  is_on_duty: boolean;
  user_id: string | null;
  created_at: string;
}

export default function StaffManagement() {
  const { organization, member, refetch } = useOrganization();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    can_upload_patients: true,
    can_view_reports: true,
    can_manage_staff: false,
  });

  const isAdmin = member?.role === "admin";

  const fetchStaff = async () => {
    if (!organization) return;
    setLoading(true);
    
    const { data, error } = await (supabase
      .from("organization_members" as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }) as any);

    if (error) {
      console.error("Error fetching staff:", error);
    } else {
      setStaff(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, [organization]);

  const handleInvite = async () => {
    if (!organization || !newStaff.name || !newStaff.email) {
      toast.error("Name and email are required");
      return;
    }

    setInviting(true);
    try {
      // Create organization member with null user_id (pending invite)
      const { error } = await (supabase.from("organization_members" as any).insert({
        organization_id: organization.id,
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone || null,
        role: newStaff.role,
        can_upload_patients: newStaff.can_upload_patients,
        can_view_reports: newStaff.can_view_reports,
        can_manage_staff: newStaff.can_manage_staff,
        user_id: null, // Will be linked when user signs up
        is_on_duty: false,
      }) as any);

      if (error) throw error;

      toast.success(`Invitation sent to ${newStaff.name}`);
      setInviteOpen(false);
      setNewStaff({
        name: "",
        email: "",
        phone: "",
        role: "staff",
        can_upload_patients: true,
        can_view_reports: true,
        can_manage_staff: false,
      });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to invite staff");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (staffId: string, role: string) => {
    try {
      const { error } = await (supabase
        .from("organization_members" as any)
        .update({
          role,
          can_manage_staff: role === "admin",
        })
        .eq("id", staffId) as any);

      if (error) throw error;
      toast.success("Role updated");
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  const handleTogglePermission = async (
    staffId: string,
    permission: "can_upload_patients" | "can_view_reports" | "is_on_duty",
    value: boolean
  ) => {
    try {
      const { error } = await (supabase
        .from("organization_members" as any)
        .update({ [permission]: value })
        .eq("id", staffId) as any);

      if (error) throw error;
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to update permission");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const { error } = await (supabase
        .from("organization_members" as any)
        .delete()
        .eq("id", staffId) as any);

      if (error) throw error;
      toast.success("Staff member removed");
      setDeleteConfirm(null);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove staff");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "nurse":
        return <Badge variant="secondary">Nurse</Badge>;
      default:
        return <Badge variant="outline">Staff</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <B2BLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Admin Access Required</h2>
            <p className="text-muted-foreground">
              Only administrators can manage staff members.
            </p>
          </div>
        </div>
      </B2BLayout>
    );
  }

  return (
    <B2BLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Staff Management
            </h1>
            <p className="text-muted-foreground">
              Manage team access and permissions for {organization?.name}
            </p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new team member to your organization. They'll receive an email to complete their account setup.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Dr. Ramesh Kumar"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newStaff.role}
                    onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="nurse">Nurse - Patient care</SelectItem>
                      <SelectItem value="staff">Staff - Basic access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 pt-2">
                  <Label>Permissions</Label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Can upload patients</span>
                    </div>
                    <Switch
                      checked={newStaff.can_upload_patients}
                      onCheckedChange={(checked) =>
                        setNewStaff({ ...newStaff, can_upload_patients: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Can view reports</span>
                    </div>
                    <Switch
                      checked={newStaff.can_view_reports}
                      onCheckedChange={(checked) =>
                        setNewStaff({ ...newStaff, can_view_reports: checked })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{staff.length}</div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {staff.filter((s) => s.role === "admin").length}
              </div>
              <p className="text-sm text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {staff.filter((s) => s.role === "nurse").length}
              </div>
              <p className="text-sm text-muted-foreground">Nurses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {staff.filter((s) => s.is_on_duty).length}
              </div>
              <p className="text-sm text-muted-foreground">On Duty</p>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage access and permissions for your staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff members yet. Invite your team to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Upload</TableHead>
                    <TableHead className="text-center">Reports</TableHead>
                    <TableHead className="text-center">On Duty</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {s.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {s.email}
                            </div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {s.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(s.role)}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.can_upload_patients}
                          onCheckedChange={(v) =>
                            handleTogglePermission(s.id, "can_upload_patients", v)
                          }
                          disabled={s.id === member?.id}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.can_view_reports}
                          onCheckedChange={(v) =>
                            handleTogglePermission(s.id, "can_view_reports", v)
                          }
                          disabled={s.id === member?.id}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.is_on_duty}
                          onCheckedChange={(v) =>
                            handleTogglePermission(s.id, "is_on_duty", v)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {s.user_id ? (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.id !== member?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(s.id, "admin")}
                                disabled={s.role === "admin"}
                              >
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(s.id, "nurse")}
                                disabled={s.role === "nurse"}
                              >
                                Make Nurse
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(s.id, "staff")}
                                disabled={s.role === "staff"}
                              >
                                Make Staff
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteConfirm(s.id)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
              <AlertDialogDescription>
                This will revoke their access to the organization. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirm && handleDeleteStaff(deleteConfirm)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </B2BLayout>
  );
}
