import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Phone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
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
    popular: false,
  },
  {
    name: "Premium",
    price: "₹999",
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
    popular: true,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

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
                  ? "border-primary shadow-lg scale-105" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                  <plan.icon className="h-6 w-6 text-primary" />
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
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-full py-6 text-base ${
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

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial with full Premium features
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
