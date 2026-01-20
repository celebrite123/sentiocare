import { useState } from "react";
import { CreditCard, Phone, MessageCircle, Check, Loader2, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRazorpayPayment } from "@/hooks/useRazorpay";

interface TrialExpiredModalProps {
  open: boolean;
  onSuccess: () => void;
}

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "₹299",
    period: "/month",
    description: "WhatsApp check-ins",
    icon: MessageCircle,
    features: [
      "Daily WhatsApp check-ins",
      "Health tracking dashboard",
      "Medicine reminders",
      "Email alerts & reports",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₹699",
    period: "/month",
    description: "Voice + WhatsApp",
    icon: Phone,
    popular: true,
    features: [
      "Daily AI voice calls",
      "WhatsApp check-ins",
      "Priority support",
      "Advanced AI insights",
    ],
  },
];

export const TrialExpiredModal = ({ open, onSuccess }: TrialExpiredModalProps) => {
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Your Trial Has Ended</DialogTitle>
          <DialogDescription className="text-base">
            Continue caring for your loved ones by choosing a plan below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                plan.popular ? "border-primary border-2" : "border-border"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
                  Recommended
                </Badge>
              )}
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="text-center">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePayment(plan.id)}
                  disabled={isLoading}
                  className={`w-full ${plan.popular ? "bg-gradient-primary" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {isLoading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay {plan.price}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Razorpay • Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  );
};
