import { useState } from "react";
import { Phone, MessageCircle, Loader2, Crown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRazorpayPayment } from "@/hooks/useRazorpay";

interface TrialExpiredModalProps {
  open: boolean;
  onSuccess: () => void;
  onDismiss?: () => void;
}

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "₹299",
    description: "WhatsApp check-ins",
    icon: MessageCircle,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₹699",
    description: "Voice + WhatsApp",
    icon: Phone,
    popular: true,
  },
];

export const TrialExpiredModal = ({ open, onSuccess, onDismiss }: TrialExpiredModalProps) => {
  const { initiatePayment, isLoading } = useRazorpayPayment();
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | null>(null);

  const handlePayment = async (planId: "basic" | "premium") => {
    setSelectedPlan(planId);
    const result = await initiatePayment(planId);
    if (result.success) {
      onSuccess();
    }
    setSelectedPlan(null);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-sm">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Trial Ended</DialogTitle>
          <DialogDescription className="text-sm">
            Choose a plan to unlock all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-3 rounded-lg border transition-all ${
                plan.popular ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2 right-3 bg-primary text-xs px-2 py-0.5">
                  Recommended
                </Badge>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <plan.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePayment(plan.id)}
                  disabled={isLoading}
                  variant={plan.popular ? "default" : "outline"}
                  className="min-w-[80px]"
                >
                  {isLoading && selectedPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    plan.price
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-2">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={handleDismiss}
          >
            Continue with limited access
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Secure payment • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
