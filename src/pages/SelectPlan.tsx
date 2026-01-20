import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Phone, MessageCircle, Loader2, Heart, Sparkles, Lock, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import { toast } from "@/hooks/use-toast";

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "₹299",
    period: "/month",
    description: "WhatsApp check-ins for daily care",
    icon: MessageCircle,
    features: [
      "Daily WhatsApp check-ins",
      "Health tracking dashboard",
      "Medicine reminders",
      "Email alerts & reports",
      "AI health insights",
    ],
    notIncluded: [
      "Voice calls"
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₹699",
    period: "/month",
    description: "Complete care with voice + WhatsApp",
    icon: Phone,
    features: [
      "Daily AI voice calls",
      "WhatsApp check-ins",
      "Health tracking dashboard",
      "Medicine reminders",
      "Instant SMS & email alerts",
      "Advanced AI health insights",
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

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="absolute inset-0 bg-background/95" />
      
      <div className="relative container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Welcome to Sentio AI</h1>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {isTrialExpired 
              ? "Your Trial Has Ended" 
              : isTrialActive 
                ? "Choose Your Plan After Trial" 
                : "Choose Your Care Plan"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isTrialExpired
              ? "Continue caring for your loved ones by selecting a plan below."
              : isTrialActive 
                ? "You're currently enjoying all Premium features for free. Select your plan for after the trial ends."
                : "Select the plan that best fits your loved one's needs"}
          </p>
          
          {isTrialActive && (
            <div className="mt-6 inline-flex flex-col items-center">
              <Badge variant="default" className="text-sm px-4 py-2 bg-gradient-primary">
                <Sparkles className="h-4 w-4 mr-2" />
                {trialDaysLeft} days left in your free trial
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                All Premium features unlocked during trial!
              </p>
            </div>
          )}

          {isTrialExpired && (
            <div className="mt-6 inline-flex flex-col items-center">
              <Badge variant="destructive" className="text-sm px-4 py-2">
                Trial Expired
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Subscribe now to continue using Sentio AI
              </p>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 bg-card border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? "border-primary shadow-lg" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                  <plan.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">per elder</p>
                  {isTrialActive && (
                    <p className="text-xs text-primary mt-2">Billing starts after trial</p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <li key={`not-${i}`} className="flex items-start gap-3 opacity-50">
                      <span className="h-5 w-5 shrink-0 mt-0.5 text-center">✕</span>
                      <span className="text-sm line-through">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading !== null || paymentLoading}
                  className={`w-full py-6 text-lg ${
                    plan.popular 
                      ? "bg-gradient-primary hover:opacity-90" 
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {(loading === plan.id || (paymentLoading && loading === plan.id)) ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : isTrialExpired ? (
                    <CreditCard className="h-5 w-5 mr-2" />
                  ) : null}
                  {isTrialExpired 
                    ? `Pay ${plan.price}` 
                    : isTrialActive 
                      ? `Select ${plan.name} for After Trial` 
                      : `Select ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trial info */}
        <div className="text-center mt-12">
          {isTrialActive ? (
            <>
              <p className="text-muted-foreground">
                <Lock className="inline h-4 w-4 mr-1" />
                Your plan choice will be applied when your trial ends.
              </p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => navigate("/elders")}
              >
                Skip for now and continue with trial →
              </Button>
            </>
          ) : isTrialExpired ? (
            <p className="text-sm text-muted-foreground">
              Secure payment powered by Razorpay • Cancel anytime
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Start with a 5-day free trial. All premium features included.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                No credit card required • Cancel anytime
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectPlan;
