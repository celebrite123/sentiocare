import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Phone, MessageCircle, Sparkles } from "lucide-react";
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
      "Custom health monitoring",
      "Medicine reminders & tracking",
      "Health dashboard with trends",
      "Email alerts & weekly reports",
      "AI-powered health insights",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "₹699",
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

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-secondary/10 text-secondary border-0 px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative p-8 bg-card border-2 transition-all duration-300 hover:shadow-2xl ${
                plan.popular 
                  ? "border-secondary shadow-xl shadow-secondary/10 md:scale-105" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-secondary text-secondary-foreground text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`mx-auto mb-4 p-4 rounded-2xl w-fit ${plan.popular ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                  <plan.icon className={`h-8 w-8 ${plan.popular ? 'text-secondary' : 'text-primary'}`} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
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

              <Button
                className={`w-full rounded-full py-6 text-base font-semibold ${
                  plan.popular 
                    ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
                onClick={() => navigate("/auth")}
              >
                Start Free Trial
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial with full Premium features
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
