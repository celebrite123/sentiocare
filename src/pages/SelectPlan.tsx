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
        <div className="min-h-screen bg-muted/30 pt-16">
          <div className="container mx-auto px-4 py-16 max-w-lg text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">You're on the Waitlist!</h1>
              <p className="text-muted-foreground">
                Thank you for signing up for Sentio AI. We're reviewing your application and will notify you once you're approved.
              </p>
            </div>

            <Card className="text-left">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-bold">✓</div>
                  <span className="text-sm">Account created</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Waiting for approval</span>
                </div>
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">3</div>
                  <span className="text-sm">5-day free trial starts</span>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground mt-6">
              We'll send you an email once your account is approved. Usually within 24 hours.
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
        <div className="min-h-screen bg-muted/30 pt-16">
          <div className="container mx-auto px-4 py-16 max-w-lg text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your Trial is Active!</h1>
            <Badge variant="default" className="bg-primary mb-4">
              {trialDaysLeft} days left
            </Badge>
            <p className="text-muted-foreground mb-6">
              You have full access to all Premium features during your trial.
            </p>
            <Button onClick={() => navigate("/elders/add")} className="w-full max-w-xs">
              Add Your First Elder
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
      <div className="min-h-screen bg-muted/30 pt-16">
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/elders")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-center mb-6">
            <img src={sentioLogo} alt="Sentio" className="h-8 w-auto mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Continue with Sentio</h1>
            <Badge variant="outline" className="border-destructive text-destructive mt-2">
              Trial ended
            </Badge>
          </div>

          <Card className="border-primary shadow-md">
            <CardHeader className="text-center pb-2 pt-5">
              <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Premium</CardTitle>
              <p className="text-xs text-muted-foreground">Voice + WhatsApp</p>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <div className="text-center">
                <span className="text-2xl font-bold">₹699</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                <p className="text-xs text-muted-foreground">per elder</p>
              </div>

              <ul className="space-y-1.5 text-sm">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
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
              onClick={() => navigate("/elders")}
              className="text-muted-foreground"
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
