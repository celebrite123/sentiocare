import { useState } from "react";
import { Bell, X, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRenewalReminders } from "@/hooks/useRenewalReminders";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

interface RenewalReminderBannerProps {
  onDismiss?: () => void;
}

const RenewalReminderBanner = ({ onDismiss }: RenewalReminderBannerProps) => {
  const { 
    daysUntilExpiry, 
    expiryDate, 
    autoRenewalEnabled, 
    hasPaymentMethod,
    showReminder 
  } = useRenewalReminders();
  const { tier, refetch: refetchSubscription } = useSubscription();
  const { initiatePayment, isLoading } = useRazorpayPayment();
  const [dismissed, setDismissed] = useState(false);

  if (!showReminder || dismissed) return null;

  const handleRenewNow = async () => {
    const result = await initiatePayment(tier);
    if (result.success) {
      refetchSubscription();
      toast({
        title: "Subscription renewed! 🎉",
        description: "Your subscription has been extended for another month.",
      });
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const urgencyColor = daysUntilExpiry <= 1 ? "border-destructive bg-destructive/10" : "border-warning bg-warning/10";
  const urgencyIcon = daysUntilExpiry <= 1 ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Bell className="h-5 w-5 text-warning" />;

  const expiryText = daysUntilExpiry <= 0 
    ? "Today" 
    : daysUntilExpiry === 1 
      ? "Tomorrow" 
      : `in ${daysUntilExpiry} days`;

  return (
    <Card className={`p-4 mb-4 border-2 ${urgencyColor} relative`}>
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5">{urgencyIcon}</div>
        <div className="flex-1">
          <p className="font-semibold">
            Your subscription expires {expiryText}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {!hasPaymentMethod 
              ? "Add a payment method to enable auto-renewal and never lose access."
              : !autoRenewalEnabled 
                ? "Auto-renewal is disabled. Renew now to keep protecting your loved ones."
                : "Renew now to continue your subscription."
            }
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={handleRenewNow}
              disabled={isLoading}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {isLoading ? "Processing..." : "Renew Now"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RenewalReminderBanner;
