import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Phone, MessageSquare, Brain, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: Phone,
    title: "AI Voice Calls",
    description: "Compassionate voice conversations that feel human to check on medicine intake and well-being",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Check-ins",
    description: "Daily text-based health monitoring through the familiar WhatsApp interface they already use",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Brain,
    title: "Context-Aware AI",
    description: "AI maintains complete patient history and personalizes every conversation based on their needs",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: Shield,
    title: "Instant Alerts",
    description: "Family members notified immediately via email or SMS if AI detects any health concerns",
    gradient: "from-info/20 to-info/5",
  },
  {
    icon: Heart,
    title: "Digital Health Book",
    description: "Complete medical history, check-in logs, and AI insights in one secure, accessible place",
    gradient: "from-destructive/20 to-destructive/5",
  },
  {
    icon: Clock,
    title: "24/7 Monitoring",
    description: "Continuous AI-powered care without the need for constant family supervision",
    gradient: "from-warning/20 to-warning/5",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need for <span className="text-primary">Peace of Mind</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Advanced AI technology that feels human, ensuring comprehensive care
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
