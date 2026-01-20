import { useState } from "react";
import { AlertTriangle, XCircle, Loader2, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiryDate?: Date | null;
  onCancelled: () => void;
}

const CancelSubscriptionDialog = ({
  open,
  onOpenChange,
  expiryDate,
  onCancelled,
}: CancelSubscriptionDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!user) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          auto_renewal_enabled: false,
          cancellation_requested_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Subscription Cancelled",
        description: expiryDate 
          ? `You can continue using Sentio until ${expiryDate.toLocaleDateString()}.`
          : "Your subscription has been cancelled.",
      });

      onCancelled();
      onOpenChange(false);
      setStep(1);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Review our cancellation policy before proceeding" 
              : "Are you sure you want to cancel?"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            {/* Policy Summary */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium text-primary">Within 7 Days</p>
                  <p className="text-sm text-primary/80">Full refund, no questions asked</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                <div>
                  <p className="font-medium text-accent-foreground">After 7 Days</p>
                  <p className="text-sm text-muted-foreground">No refund, but access continues until subscription ends</p>
                </div>
              </div>
            </div>

            {expiryDate && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">
                  Your access will continue until{" "}
                  <span className="font-medium text-foreground">
                    {expiryDate.toLocaleDateString("en-IN", { 
                      day: "numeric", 
                      month: "long", 
                      year: "numeric" 
                    })}
                  </span>
                </p>
              </div>
            )}

            <Link 
              to="/cancellation-refund" 
              className="flex items-center gap-1 text-sm text-primary hover:underline"
              target="_blank"
            >
              View full cancellation policy
              <ExternalLink className="h-3 w-3" />
            </Link>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Keep Subscription
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">This action cannot be undone</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-renewal will be disabled. You'll need to subscribe again to continue after your current period ends.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{" "}
              <a 
                href="mailto:info@sentio.in.net?subject=Cancellation%20Help" 
                className="text-primary hover:underline"
              >
                info@sentio.in.net
              </a>
            </p>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Go Back
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 gap-2"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CancelSubscriptionDialog;
