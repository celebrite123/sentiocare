import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const included = [
  "Daily AI voice calls in Hindi or English",
  "WhatsApp check-ins &amp; family summaries",
  "Medicine reminders &amp; adherence reports",
  "Symptom follow-ups &amp; early-warning alerts",
  "Custom monitoring — ask anything, daily",
  "Instant caregiver escalation (call + WhatsApp)",
  "Family dashboard with 30-day trends",
  "Priority human support",
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-muted/40" id="pricing-section">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-primary/70 mb-4">Pricing</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-[1.05]">
            One plan. <span className="italic text-primary">Everything included.</span>
          </h2>
          <p className="text-muted-foreground mt-4">One month free on approval. Cancel anytime.</p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="relative p-8 md:p-10 bg-card border-2 border-primary/20 rounded-3xl shadow-elegant overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" aria-hidden="true" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary-foreground text-xs font-medium tracking-wide uppercase mb-6">
                Founding-family price
              </div>
              <h3 className="font-serif text-3xl text-foreground mb-1">Sentio Premium</h3>
              <p className="text-sm text-muted-foreground mb-6">Complete care — voice + WhatsApp + family dashboard</p>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-serif text-6xl text-foreground leading-none">₹699</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">per elderly parent · 30-day free trial</p>

              <ul className="space-y-3 mb-8">
                {included.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: item }} />
                  </li>
                ))}
              </ul>

              <Button
                className="w-full rounded-full h-14 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant"
                onClick={() => navigate("/auth")}
              >
                Join the waitlist
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                We approve new families every few days.
              </p>
            </div>
          </Card>

          <div className="mt-10 space-y-2 text-sm">
            <p className="text-center text-muted-foreground mb-4">Compare the alternatives</p>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border">
              <span className="text-foreground/70">Full-time caregiver</span>
              <span className="font-medium text-muted-foreground line-through">₹25,000/mo</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border">
              <span className="text-foreground/70">Wearable device</span>
              <span className="font-medium text-muted-foreground line-through">₹15,000 + 40% abandoned</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/[0.06] border border-primary/20">
              <span className="font-medium text-foreground">Sentio</span>
              <span className="font-semibold text-primary">₹699/mo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
