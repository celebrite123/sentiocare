import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Bell, Brain, Heart, Shield, Settings2, Activity, Sparkles } from "lucide-react";
import elderPhoneCall from "@/assets/elder-phone-call.png";
import caregiverPeaceOfMind from "@/assets/caregiver-peace-of-mind.png";

const features = [
  {
    icon: Phone,
    title: "AI Voice Calls",
    description: "Natural conversations in Hindi & English. Your parents feel like they're talking to a caring family member.",
    color: "primary",
    isNew: false,
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Check-ins",
    description: "Familiar messaging for daily health updates. Seniors respond at their own pace, on their schedule.",
    color: "whatsapp",
    isNew: false,
  },
  {
    icon: Settings2,
    title: "Custom Health Monitoring",
    description: "Track what matters most—blood pressure, meals, sleep, or your own custom questions tailored to your loved one.",
    color: "secondary",
    isNew: true,
  },
  {
    icon: Brain,
    title: "AI Health Insights",
    description: "Smart analysis of conversations to detect subtle mood and health changes over time.",
    color: "primary",
    isNew: false,
  },
  {
    icon: Activity,
    title: "Symptom Tracking",
    description: "Automatic detection and follow-up on reported symptoms. Celebrate improvements, catch concerns early.",
    color: "accent",
    isNew: true,
  },
  {
    icon: Bell,
    title: "Instant Caregiver Alerts",
    description: "Multi-channel notifications via WhatsApp, SMS, and email when something needs your attention.",
    color: "secondary",
    isNew: false,
  },
  {
    icon: Heart,
    title: "Medicine Reminders",
    description: "Ensure medications are taken on time. Track adherence and get alerts for missed doses.",
    color: "primary",
    isNew: false,
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "HIPAA-compliant data handling. Your family's health information stays secure and private.",
    color: "accent",
    isNew: false,
  },
];

const FeaturesSection = () => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground";
      case "secondary":
        return "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground";
      case "accent":
        return "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground";
      case "whatsapp":
        return "bg-whatsapp/10 text-whatsapp group-hover:bg-whatsapp group-hover:text-white";
      default:
        return "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground";
    }
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header with Illustration */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="order-2 lg:order-1">
            <Badge variant="secondary" className="mb-4 bg-secondary/10 text-secondary border-0 px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Personalized Care
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What We Do For You
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Comprehensive care features designed for Indian families. Now with <strong>custom health monitoring</strong>—track exactly what matters for your loved one.
            </p>
          </div>
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl" />
              <img 
                src={elderPhoneCall} 
                alt="Elder receiving care call"
                className="relative w-48 h-48 object-cover rounded-2xl shadow-lg border border-primary/10"
                width={192}
                height={192}
                loading="lazy"
              />
            </div>
            <div className="relative mt-8">
              <div className="absolute inset-0 bg-secondary/10 rounded-2xl blur-xl" />
              <img 
                src={caregiverPeaceOfMind} 
                alt="Caregiver feeling at peace"
                className="relative w-48 h-48 object-cover rounded-2xl shadow-lg border border-secondary/10"
                width={192}
                height={192}
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`group p-5 bg-card border transition-all duration-300 hover:shadow-xl relative ${
                feature.isNew 
                  ? "border-secondary/50 shadow-md shadow-secondary/5" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              {feature.isNew && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 shadow-lg">
                    NEW
                  </Badge>
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${getColorClasses(feature.color)}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
