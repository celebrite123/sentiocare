import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Phone, MessageCircle, CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const plans = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "₹299",
    priceNum: 299,
    period: "/month",
    description: "WhatsApp check-ins for daily care",
    icon: MessageCircle,
    features: [
      "Daily WhatsApp check-ins",
      "Custom health monitoring",
      "Medicine reminders & tracking",
      "Health dashboard with trends",
      "Email alerts & weekly reports",
      "AI-powered health insights",
    ],
    popular: false,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "₹699",
    priceNum: 699,
    period: "/month",
    description: "Complete care with voice + WhatsApp",
    icon: Phone,
    features: [
      "Daily AI voice calls in Hindi/English",
      "WhatsApp check-ins included",
      "Custom health monitoring & questions",
      "Automatic symptom tracking",
      "Medicine reminders & adherence reports",
      "Instant SMS, email & call alerts",
      "Emergency callback system",
      "Priority 24/7 support",
    ],
    popular: true,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiatePayment, isLoading } = useRazorpayPayment();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium" | null>(null);

  const handleBuyNow = (planId: "basic" | "premium") => {
    if (!user) {
      // Not logged in, redirect to auth
      navigate("/auth");
      return;
    }
    // Show buy dialog for logged in users
    setSelectedPlan(planId);
    setShowBuyDialog(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return;
    
    const result = await initiatePayment(selectedPlan);
    if (result.success) {
      setShowBuyDialog(false);
      navigate("/elders");
    }
  };

  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative p-8 bg-card border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? "border-secondary shadow-lg shadow-secondary/10 scale-105" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${plan.popular ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                  <plan.icon className={`h-6 w-6 ${plan.popular ? 'text-secondary' : 'text-primary'}`} />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">per elder</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`h-5 w-5 shrink-0 mt-0.5 ${plan.popular ? 'text-secondary' : 'text-primary'}`} />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <Button
                  className={`w-full rounded-full py-6 text-base ${
                    plan.popular 
                      ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25" 
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={() => navigate("/auth")}
                >
                  Start Free Trial
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full rounded-full py-6 text-base gap-2"
                  onClick={() => handleBuyNow(plan.id)}
                >
                  <CreditCard className="h-4 w-4" />
                  Buy Now - {plan.price}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial with full Premium features
          </p>
        </div>
      </div>

      {/* Buy Now Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {user ? `Subscribe to ${selectedPlanDetails?.name}` : "Sign in to Subscribe"}
            </DialogTitle>
            <DialogDescription>
              {user 
                ? "Complete your purchase to start using Sentio AI immediately."
                : "Please sign in or create an account to subscribe."
              }
            </DialogDescription>
          </DialogHeader>
          
          {user && selectedPlanDetails && (
            <div className="space-y-4 py-4">
              <Card className="border-primary">
                <div className="p-6">
                  <div className="text-center space-y-2">
                    <div className={`mx-auto mb-3 p-3 rounded-full w-fit ${selectedPlanDetails.popular ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                      <selectedPlanDetails.icon className={`h-6 w-6 ${selectedPlanDetails.popular ? 'text-secondary' : 'text-primary'}`} />
                    </div>
                    <p className="text-xl font-semibold">{selectedPlanDetails.name} Plan</p>
                    <p className="text-3xl font-bold">{selectedPlanDetails.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  </div>
                </div>
              </Card>

              <Button 
                className="w-full gap-2 py-6"
                onClick={handleConfirmPurchase}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {isLoading ? "Processing..." : `Pay ${selectedPlanDetails.price}`}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Secure payment powered by Razorpay • Cancel anytime
              </p>
            </div>
          )}
          
          {!user && (
            <div className="py-4">
              <Button 
                className="w-full"
                onClick={() => {
                  setShowBuyDialog(false);
                  navigate("/auth");
                }}
              >
                Sign In / Create Account
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
