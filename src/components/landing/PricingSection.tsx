import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Essential",
    price: "₹299",
    period: "/month",
    description: "Perfect for basic daily monitoring",
    features: [
      "Daily WhatsApp check-ins",
      "Medicine reminders",
      "Symptom tracking",
      "Digital health book",
      "Basic AI analysis",
      "Family dashboard access",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "₹999",
    period: "/month",
    description: "Complete care with voice calls",
    features: [
      "Everything in Essential",
      "AI Voice calls (2x daily)",
      "Advanced AI insights",
      "Emergency alerts",
      "Priority support",
      "Detailed health reports",
      "Multiple family members",
    ],
    popular: true,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free for 14 days. No credit card required.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                plan.popular
                  ? "border-2 border-primary scale-105 shadow-xl"
                  : "border-2 hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 blur-3xl" />
                  <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-primary border-0 px-4 py-1 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </Badge>
                </>
              )}

              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-12 text-base ${
                    plan.popular
                      ? "bg-gradient-primary hover:opacity-90"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
