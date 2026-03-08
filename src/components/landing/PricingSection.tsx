import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Phone, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  "Daily AI voice calls in Hindi/English",
  "WhatsApp check-ins included",
  "Custom health monitoring & questions",
  "Automatic symptom tracking",
  "Medicine reminders & adherence reports",
  "Instant SMS, email & call alerts",
  "Emergency callback system",
  "Priority 24/7 support",
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-muted/30" id="pricing-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            One plan. Everything included. Cancel anytime.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="relative p-8 bg-card border-2 border-secondary shadow-lg shadow-secondary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-secondary text-foreground text-xs font-semibold px-4 py-1 rounded-full inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Launch Offer
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="mx-auto mb-4 p-3 rounded-full w-fit bg-secondary/10">
                <Phone className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">Premium</h3>
              <p className="text-foreground/70 text-sm mb-4">Complete care with voice + WhatsApp</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-foreground">₹699</span>
                <span className="text-foreground/60">/month</span>
              </div>
              <p className="text-sm text-foreground/60 mt-1">per elder</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5 text-secondary" />
                  <span className="text-sm text-foreground/75">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full rounded-full py-6 text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25"
              onClick={() => navigate("/auth")}
            >
              Join Waitlist
            </Button>
            <p className="text-center text-xs text-foreground/50 mt-3">
              No credit card required • Cancel anytime
            </p>
          </Card>
        </div>

        {/* Cost comparison */}
        <div className="max-w-lg mx-auto mt-10 space-y-3">
          <p className="text-center text-sm font-medium text-foreground/80 mb-4">How Sentio compares:</p>
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
            <span className="text-sm text-foreground/70">Full-time caregiver</span>
            <span className="text-sm font-semibold text-destructive line-through">₹25,000/mo</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
            <span className="text-sm text-foreground/70">Wearable devices</span>
            <span className="text-sm font-semibold text-destructive line-through">₹15,000 + 40% abandon</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
            <span className="text-sm font-medium text-foreground">Sentio AI</span>
            <span className="text-sm font-bold text-secondary">₹699/mo ✓</span>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-foreground/65">
            Sign up → 5-day free trial → Subscribe if you love it
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
