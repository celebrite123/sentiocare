import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Phone, MessageCircle, Loader2, Heart, Sparkles, Lock, CreditCard, ArrowLeft, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "₹299",
    period: "/mo",
    description: "WhatsApp check-ins",
    icon: MessageCircle,
    features: [
      "Daily WhatsApp check-ins",
      "Health tracking dashboard",
      "Medicine reminders",
      "Email alerts & reports",
    ],
    notIncluded: ["Voice calls"],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₹699",
    period: "/mo",
    description: "Voice + WhatsApp",
    icon: Phone,
    features: [
      "Daily AI voice calls",
      "WhatsApp check-ins",
      "SMS & email alerts",
      "Priority support",
    ],
    notIncluded: [],
    popular: true,
  },
];

const SelectPlan = () => {
  const navigate = useNavigate();
  const { updateTier, isTrialActive, trialDaysLeft, status, refetch } = useSubscription();
  const { initiatePayment, isLoading: paymentLoading } = useRazorpayPayment();
  const [loading, setLoading] = useState<string | null>(null);

  // Check if trial has expired
  const isTrialExpired = !isTrialActive && status === "trial";

  const handleSelectPlan = async (planId: "basic" | "premium") => {
    // During trial, users can only preview plans - selection applies after trial
    if (isTrialActive) {
      toast({
        title: "Plan Selected for After Trial",
        description: `You've selected the ${planId === "premium" ? "Premium" : "Basic"} plan. This will apply when your trial ends. Enjoy all Premium features during your trial!`,
      });
      navigate("/elders/add");
      return;
    }

    // If trial has expired, show payment
    if (isTrialExpired || status === "expired") {
      setLoading(planId);
      const result = await initiatePayment(planId);
      if (result.success) {
        refetch();
        navigate("/elders");
      }
      setLoading(null);
      return;
    }

    // For new users without trial, just set the tier
    setLoading(planId);
    
    const success = await updateTier(planId);
    
    if (success) {
      toast({
        title: "Plan selected! 🎉",
        description: `You've chosen the ${planId === "premium" ? "Premium" : "Basic"} plan. Let's add your first elder.`,
      });
      navigate("/elders/add");
    } else {
      toast({
        title: "Error",
        description: "Failed to select plan. Please try again.",
        variant: "destructive",
      });
    }
    
    setLoading(null);
  };

  const canSkip = isTrialActive || isTrialExpired;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pt-16">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/elders")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Compact Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">
                {isTrialExpired 
                  ? "Continue with Sentio" 
                  : isTrialActive 
                    ? "Choose Your Plan" 
                    : "Select a Plan"}
              </h1>
            </div>
            
            {isTrialActive && (
              <Badge variant="default" className="bg-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                {trialDaysLeft} days left in trial
              </Badge>
            )}

            {isTrialExpired && (
              <Badge variant="outline" className="border-destructive text-destructive">
                Trial ended
              </Badge>
            )}
          </div>

          {/* Plans - Compact Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular 
                    ? "border-primary shadow-md" 
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-xs">
                    Recommended
                  </Badge>
                )}

                <CardHeader className="text-center pb-2 pt-5">
                  <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
                    <plan.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="text-center">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                    <p className="text-xs text-muted-foreground">per elder</p>
                  </div>

                  <ul className="space-y-1.5 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, i) => (
                      <li key={`not-${i}`} className="flex items-center gap-2 opacity-50">
                        <X className="h-4 w-4 shrink-0" />
                        <span className="text-xs line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading !== null || paymentLoading}
                    className={`w-full ${plan.popular ? "bg-primary" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    size="sm"
                  >
                    {(loading === plan.id || (paymentLoading && loading === plan.id)) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : isTrialExpired ? (
                      <CreditCard className="h-4 w-4 mr-1" />
                    ) : null}
                    {isTrialExpired ? `Pay ${plan.price}` : `Select ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 space-y-3">
            {canSkip && (
              <Button 
                variant="ghost" 
                onClick={() => navigate("/elders")}
                className="text-muted-foreground"
              >
                {isTrialActive ? "Skip — Continue with Trial" : "Continue with limited access"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {isTrialExpired 
                ? "Secure payment • Cancel anytime"
                : "5-day free trial • No credit card required"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectPlan;
