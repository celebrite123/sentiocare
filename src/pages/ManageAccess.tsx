import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserPlus, Users, Trash2, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AccessRecord {
  id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  invite_status: string;
  created_at: string;
}

interface Elder {
  id: string;
  full_name: string;
}

export default function ManageAccess() {
  const { elderId } = useParams();
  const navigate = useNavigate();
  const [elder, setElder] = useState<Elder | null>(null);
  const [accessList, setAccessList] = useState<AccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (elderId) {
      loadData();
    }
  }, [elderId]);

  const loadData = async () => {
    try {
      // Load elder info
      const { data: elderData, error: elderError } = await supabase
        .from("elders")
        .select("id, full_name")
        .eq("id", elderId)
        .single();

      if (elderError) throw elderError;
      setElder(elderData);

      // Load access list
      const { data: accessData, error: accessError } = await supabase
        .from("elder_access")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: false });

      if (accessError) throw accessError;
      setAccessList(accessData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load access data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!elderId) return;

    setInviting(true);
    try {
      const { error } = await supabase
        .from("elder_access")
        .insert({
          elder_id: elderId,
          user_id: crypto.randomUUID(), // Placeholder - will be updated when user accepts
          role: inviteRole,
          invited_email: inviteEmail.trim().toLowerCase(),
          invite_status: "pending",
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      loadData();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      if (error.code === "23505") {
        toast.error("This person already has access");
      } else {
        toast.error("Failed to send invitation");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("elder_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;

      toast.success("Access removed");
      loadData();
    } catch (error) {
      console.error("Error removing access:", error);
      toast.error("Failed to remove access");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "caregiver":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!elder) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Elder not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(`/elders/${elderId}/settings`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Manage Access</h1>
            <p className="text-muted-foreground">
              Share access to {elder.full_name}'s care with family members
            </p>
          </div>
        </div>

        {/* Invite New Person */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Invite Family Member
            </CardTitle>
            <CardDescription>
              Send an invitation to share access to this elder's information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="family@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Access Level</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Viewer</span>
                        <span className="text-xs text-muted-foreground">Can view check-ins and health data</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="caregiver">
                      <div className="flex flex-col items-start">
                        <span>Caregiver</span>
                        <span className="text-xs text-muted-foreground">Can view and receive alerts</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleInvite} disabled={inviting}>
              <Mail className="mr-2 h-4 w-4" />
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </CardContent>
        </Card>

        {/* Current Access List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              People with Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accessList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No one else has access yet. Invite family members above.
              </p>
            ) : (
              <div className="space-y-3">
                {accessList.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {access.invited_email || "Unknown"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(access.role)}>
                            {access.role.charAt(0).toUpperCase() + access.role.slice(1)}
                          </Badge>
                          {getStatusBadge(access.invite_status)}
                        </div>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Access</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {access.invited_email}'s access to {elder.full_name}'s care information. They will no longer be able to view check-ins or receive alerts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveAccess(access.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
