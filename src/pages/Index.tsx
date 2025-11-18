import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Phone, MessageSquare, Brain, Shield, Clock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Phone,
      title: "AI Voice Calls",
      description: "Compassionate voice conversations to check on medicine intake and well-being",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Check-ins",
      description: "Daily text-based health monitoring through familiar WhatsApp interface",
    },
    {
      icon: Brain,
      title: "Context-Aware AI",
      description: "AI maintains patient history and personalizes every conversation",
    },
    {
      icon: Shield,
      title: "Instant Alerts",
      description: "Family members notified immediately if AI detects any concerns",
    },
    {
      icon: Heart,
      title: "Digital Health Book",
      description: "Complete medical history and check-in logs in one secure place",
    },
    {
      icon: Clock,
      title: "24/7 Monitoring",
      description: "Continuous care without the need for constant family supervision",
    },
  ];

  const plans = [
    {
      name: "Essential",
      price: "₹299",
      period: "/month",
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
      features: [
        "Everything in Essential",
        "AI Voice calls (2x daily)",
        "WhatsApp check-ins",
        "Advanced AI insights",
        "Emergency alerts",
        "Priority support",
        "Detailed health reports",
      ],
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              AI-Powered Elder Care
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Never Miss
              </span>
              <br />
              A Moment in Their Care
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sentio AI combines compassionate AI conversations with intelligent monitoring to keep your elderly loved ones safe, healthy, and connected.
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-gradient-primary hover:opacity-90 text-lg"
                onClick={() => navigate("/auth")}
              >
                Get Started Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg"
                onClick={() => navigate("/dashboard")}
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How Sentio AI Cares for Your Loved Ones
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Advanced AI technology that feels human, ensuring comprehensive care and peace of mind
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose the plan that best fits your family's needs
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${
                  plan.popular
                    ? "border-2 border-primary shadow-xl scale-105"
                    : "border-2"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-primary hover:opacity-90"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-background opacity-95" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Provide Better Care?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of families who trust Sentio AI to keep their loved ones safe and healthy
            </p>
            <Button
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-lg"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
