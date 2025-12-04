import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Basic",
    price: "₹499",
    period: "/month",
    description: "Essential care for one elder",
    features: [
      "1 Daily WhatsApp check-in",
      "Basic health tracking",
      "Email alerts",
      "Weekly summary reports",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "₹999",
    period: "/month",
    description: "Complete care package",
    features: [
      "Daily voice calls + WhatsApp",
      "Medicine tracking & reminders",
      "Instant SMS & call alerts",
      "AI health insights",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Family",
    price: "₹1,499",
    period: "/month",
    description: "Care for multiple elders",
    features: [
      "Everything in Premium",
      "Up to 3 elders",
      "Family dashboard",
      "Emergency SOS feature",
      "Dedicated care manager",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative p-6 bg-card border transition-all duration-300 hover:shadow-lg ${
                plan.popular 
                  ? "border-primary shadow-lg scale-105" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-full ${
                  plan.popular 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
                onClick={() => navigate("/auth")}
              >
                Start Free Trial
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;