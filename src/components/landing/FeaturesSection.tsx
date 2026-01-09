import { Card } from "@/components/ui/card";
import { Phone, MessageCircle, Bell, Brain, Heart, Shield } from "lucide-react";
import elderPhoneCall from "@/assets/elder-phone-call.png";
import caregiverPeaceOfMind from "@/assets/caregiver-peace-of-mind.png";

const features = [
  {
    icon: Phone,
    title: "Voice Calls",
    description: "Natural AI conversations in English and Hindi. Elders feel like they're talking to a caring family member.",
    color: "primary",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Chat",
    description: "Familiar messaging interface for daily check-ins. Seniors respond at their own pace.",
    color: "whatsapp",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Get notified instantly when something needs attention. Never miss an important health signal.",
    color: "secondary",
  },
  {
    icon: Brain,
    title: "AI Insights",
    description: "Track wellbeing trends over time. AI analyzes conversations to detect subtle changes.",
    color: "primary",
  },
  {
    icon: Heart,
    title: "Medicine Reminders",
    description: "Ensure medications are taken on time. Track compliance and get alerts for missed doses.",
    color: "secondary",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "HIPAA-compliant data handling. Your family's health information stays secure and private.",
    color: "accent",
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Comprehensive care features designed for Indian families. Keep your parents safe and connected with technology they already know and love.
            </p>
          </div>
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl" />
              <img 
                src={elderPhoneCall} 
                alt="Elder receiving care call"
                className="relative w-48 h-48 object-cover rounded-2xl shadow-lg border border-primary/10"
              />
            </div>
            <div className="relative mt-8">
              <div className="absolute inset-0 bg-secondary/10 rounded-2xl blur-xl" />
              <img 
                src={caregiverPeaceOfMind} 
                alt="Caregiver feeling at peace"
                className="relative w-48 h-48 object-cover rounded-2xl shadow-lg border border-secondary/10"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group p-6 bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${getColorClasses(feature.color)}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
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
