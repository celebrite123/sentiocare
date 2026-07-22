import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Phone, Loader2, CreditCard, ArrowLeft, Clock, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useRazorpayPayment } from "@/hooks/useRazorpay";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import sentioLogo from "@/assets/sentio-logo-new.png";

const features = [
  "Daily AI voice calls in Hindi/English",
  "WhatsApp check-ins included",
  "Custom health monitoring & questions",
  "Medicine reminders & adherence reports",
];

const SelectPlan = () => {
  const navigate = useNavigate();
  const { isTrialActive, trialDaysLeft, status, isWaitlisted, refetch } = useSubscription();
  const { initiatePayment, isLoading: paymentLoading } = useRazorpayPayment();
  const [loading, setLoading] = useState(false);

  const isTrialExpired = !isTrialActive && status === "trial";

  // Waitlisted users see a status page
  if (isWaitlisted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16 max-w-xl">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/[0.08] flex items-center justify-center mb-5">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <p className="text-xs tracking-[0.2em] uppercase text-primary/70 mb-3">Application received</p>
              <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
                You're on the <span className="italic text-primary">waitlist.</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thank you for signing up for Sentio. We approve new families every few days and will email you the moment you're in.
              </p>
            </div>

            <Card className="rounded-2xl border-border">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">✓</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Account created</p>
                    <p className="text-xs text-muted-foreground">You'll sign in here once approved</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/[0.08] flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Waiting for approval</p>
                    <p className="text-xs text-muted-foreground">Usually within 24–72 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">3</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">30-day free trial starts</p>
                    <p className="text-xs text-muted-foreground">All Premium features unlocked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Questions? Email <a href="mailto:hello@sentio.in.net" className="text-primary hover:underline">hello@sentio.in.net</a>
            </p>
          </div>
        </div>
      </>
    );
  }

  // Trial active users - just redirect
  if (isTrialActive) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16 max-w-xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/[0.08] flex items-center justify-center mb-5">
              <PartyPopper className="h-7 w-7 text-primary" />
            </div>
            <p className="text-xs tracking-[0.2em] uppercase text-primary/70 mb-3">You're in</p>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
              Your trial is <span className="italic text-primary">active.</span>
            </h1>
            <Badge variant="outline" className="border-primary/25 text-primary bg-primary/[0.06] mb-4">
              {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left
            </Badge>
            <p className="text-muted-foreground mb-8">
              All Premium features unlocked. Add your first parent to start daily check-ins.
            </p>
            <Button onClick={() => navigate("/elders/add")} className="rounded-full h-12 px-8 shadow-elegant">
              Add your first elder
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Trial expired or expired status - show payment
  const handlePayment = async () => {
    setLoading(true);
    const result = await initiatePayment("premium");
    if (result.success) {
      refetch();
      navigate("/elders");
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-muted/30 pt-16 flex flex-col">
        <div className="container mx-auto px-4 py-6 md:py-10 max-w-md w-full flex-1 flex flex-col justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/elders")}
            className="mb-4 -ml-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center mb-5">
            <img src={sentioLogo} alt="Sentio" className="h-7 w-auto mx-auto mb-3" />
            <h1 className="text-xl md:text-2xl font-bold">Continue with Sentio</h1>
            <Badge variant="outline" className="border-destructive text-destructive mt-2 text-xs">
              Trial ended
            </Badge>
          </div>

          <Card className="border-primary shadow-md">
            <CardHeader className="text-center pb-2 pt-4">
              <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base md:text-lg">Premium</CardTitle>
              <p className="text-xs text-muted-foreground">Voice + WhatsApp</p>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="text-center">
                <span className="text-xl md:text-2xl font-bold">₹699</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                <p className="text-xs text-muted-foreground">per elder</p>
              </div>

              <ul className="space-y-1 text-sm">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handlePayment}
                disabled={loading || paymentLoading}
                className="w-full"
              >
                {loading || paymentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                Pay ₹699/mo
              </Button>
            </CardContent>
          </Card>

          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/elders")}
              className="text-muted-foreground h-auto py-1"
            >
              Continue with limited access
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Secure payment • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectPlan;
