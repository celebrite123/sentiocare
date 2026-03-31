import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface WaitlistUser {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string | null;
  waitlist_status: string;
  created_at: string;
  email?: string;
}

const WaitlistManager = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWaitlist = async () => {
    try {
      // Admin can view all profiles - use service role via edge function or RPC
      // Since admin RLS doesn't cover profiles, we query directly (admin has has_role check)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone_number, waitlist_status, created_at, subscription_status")
        .or("subscription_status.eq.waitlisted,waitlist_status.eq.pending,waitlist_status.eq.approved,waitlist_status.eq.rejected")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching waitlist:", error);
        toast.error("Failed to load waitlist");
        return;
      }

      setUsers((data as any[]) || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleApprove = async (profileId: string, userId: string) => {
    setActionLoading(profileId);
    try {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from("profiles")
        .update({
          waitlist_status: "approved",
          waitlist_approved_at: now.toISOString(),
          waitlist_approved_by: user?.id,
          subscription_status: "trial",
          subscription_tier: "premium",
          trial_ends_at: trialEnds.toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("User approved! 5-day trial started.");
      fetchWaitlist();
    } catch (err) {
      console.error("Error approving user:", err);
      toast.error("Failed to approve user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (profileId: string) => {
    setActionLoading(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          waitlist_status: "rejected",
        })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("User rejected.");
      fetchWaitlist();
    } catch (err) {
      console.error("Error rejecting user:", err);
      toast.error("Failed to reject user");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pending = users.filter(u => {
    const subStatus = (u as any).subscription_status;
    if (subStatus === "active" || subStatus === "expired") return false;
    return subStatus === "waitlisted" || u.waitlist_status === "pending";
  });
  const approved = users.filter(u => u.waitlist_status === "approved");
  const rejected = users.filter(u => u.waitlist_status === "rejected");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{approved.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{rejected.length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Waitlist ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending users</p>
          ) : (
            <div className="space-y-3">
              {pending.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone_number || "No phone"}</p>
                    <p className="text-xs text-muted-foreground">
                      Signed up: {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(u.id, u.user_id)}
                      disabled={actionLoading === u.id}
                    >
                      {actionLoading === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(u.id)}
                      disabled={actionLoading === u.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      {approved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recently Approved ({approved.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {approved.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone_number || "No phone"}</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">Approved</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WaitlistManager;
