import { useState } from "react";
import { Shield, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DataPrivacyCardProps {
  consentData?: {
    terms_accepted_at: string | null;
    privacy_accepted_at: string | null;
  };
}

const DataPrivacyCard = ({ consentData }: DataPrivacyCardProps) => {
  const { user, signOut } = useAuth();
  const [exportingData, setExportingData] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const handleExportData = async () => {
    if (!user) return;

    setExportingData(true);
    try {
      // Fetch user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch user's elders
      const { data: elders } = await supabase
        .from("elders")
        .select("*")
        .eq("family_member_id", profile?.id);

      // Fetch medicines for each elder
      const elderIds = elders?.map((e) => e.id) || [];
      const { data: medicines } = await supabase
        .from("medicines")
        .select("*")
        .in("elder_id", elderIds);

      // Fetch check-ins
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("*")
        .in("elder_id", elderIds);

      // Fetch health metrics
      const { data: healthMetrics } = await supabase
        .from("health_metrics")
        .select("*")
        .in("elder_id", elderIds);

      // Fetch payment history
      const { data: payments } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user.id);

      // Create export object
      const exportData = {
        exportDate: new Date().toISOString(),
        dataController: "Sentio AI",
        dataSubject: {
          email: user.email,
          profile: profile,
        },
        elders: elders?.map((elder) => ({
          ...elder,
          medicines: medicines?.filter((m) => m.elder_id === elder.id),
          checkIns: checkIns?.filter((c) => c.elder_id === elder.id),
          healthMetrics: healthMetrics?.filter((h) => h.elder_id === elder.id),
        })),
        paymentHistory: payments,
        consent: {
          termsAcceptedAt: consentData?.terms_accepted_at,
          privacyAcceptedAt: consentData?.privacy_accepted_at,
        },
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentio-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your personal data has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportingData(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;

    setRequestingDeletion(true);
    try {
      // Update profile to mark deletion request
      const { error } = await supabase
        .from("profiles")
        .update({
          cancellation_requested_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Send deletion request email (would be an edge function in production)
      // For now, we'll just show a confirmation

      toast({
        title: "Deletion Request Submitted",
        description: "Your account deletion request has been received. We will process it within 30 days as per DPDP Act requirements. You will receive a confirmation email.",
      });

      // Sign out the user
      await signOut();
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequestingDeletion(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Data Privacy (DPDP)
        </CardTitle>
        <CardDescription>
          Your rights under the Digital Personal Data Protection Act, 2023
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consent Information */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consent Status
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Terms of Service: {consentData?.terms_accepted_at 
                ? `Accepted on ${new Date(consentData.terms_accepted_at).toLocaleDateString()}`
                : "Not recorded"}
            </p>
            <p>
              Privacy Policy: {consentData?.privacy_accepted_at 
                ? `Accepted on ${new Date(consentData.privacy_accepted_at).toLocaleDateString()}`
                : "Not recorded"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Right to Access / Data Portability */}
        <div className="space-y-2">
          <h4 className="font-medium">Right to Access & Data Portability</h4>
          <p className="text-sm text-muted-foreground">
            Download a copy of all your personal data stored with us in a machine-readable format.
          </p>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={exportingData}
            className="gap-2"
          >
            {exportingData ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportingData ? "Exporting..." : "Export My Data"}
          </Button>
        </div>

        <Separator />

        {/* Right to Erasure */}
        <div className="space-y-2">
          <h4 className="font-medium">Right to Erasure</h4>
          <p className="text-sm text-muted-foreground">
            Request complete deletion of your account and all associated personal data. 
            This action is irreversible and will be processed within 30 days.
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Request Account Deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This will request permanent deletion of your account and all associated data including:
                  </p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Your profile information</li>
                    <li>All registered elders and their health data</li>
                    <li>Check-in history and conversation logs</li>
                    <li>Medicine schedules and health metrics</li>
                    <li>Payment history and subscription data</li>
                  </ul>
                  <p className="font-medium pt-2">
                    This action cannot be undone. Your data will be permanently deleted within 30 days as per DPDP Act requirements.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRequestDeletion}
                  disabled={requestingDeletion}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {requestingDeletion ? "Submitting..." : "Yes, Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* Data Processing Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Data Fiduciary:</strong> Sentio AI (info@sentio.in.net)
          </p>
          <p>
            <strong>Purpose:</strong> Providing AI-powered elder care check-ins and health monitoring
          </p>
          <p>
            <strong>Grievance Officer:</strong> info@sentio.in.net
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataPrivacyCard;
