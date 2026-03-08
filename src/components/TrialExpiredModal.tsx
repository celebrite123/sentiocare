import { useState } from "react";
import { Phone, Loader2, Crown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRazorpayPayment } from "@/hooks/useRazorpay";

interface TrialExpiredModalProps {
  open: boolean;
  onSuccess: () => void;
  onDismiss?: () => void;
}

export const TrialExpiredModal = ({ open, onSuccess, onDismiss }: TrialExpiredModalProps) => {
  const { initiatePayment, isLoading } = useRazorpayPayment();

  const handlePayment = async () => {
    const result = await initiatePayment("premium");
    if (result.success) {
      onSuccess();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-sm">
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
            Subscribe to continue using Sentio AI
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="relative p-4 rounded-lg border border-primary bg-primary/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Premium</p>
                  <p className="text-xs text-muted-foreground">Voice + WhatsApp</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handlePayment}
                disabled={isLoading}
                className="min-w-[80px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "₹699/mo"
                )}
              </Button>
            </div>
          </div>
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
