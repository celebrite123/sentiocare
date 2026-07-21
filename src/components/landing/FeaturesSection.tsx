import { Card } from "@/components/ui/card";
import { Phone, MessageCircle, Bell, Brain, Heart, ShieldCheck, Settings2, Activity } from "lucide-react";

const features = [
  {
    icon: Phone,
    title: "Daily AI voice calls",
    description: "A patient, natural voice in Hindi or English — like a caring family member checking in.",
    span: "md:col-span-2 md:row-span-2",
    tall: true,
  },
  {
    icon: Heart,
    title: "Medicine adherence",
    description: "Track every dose. Nudge for missed pills. Weekly reports for the family.",
  },
  {
    icon: Activity,
    title: "Symptom follow-ups",
    description: "Symptoms mentioned yesterday become gentle questions today.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp summaries",
    description: "🟢 🟡 🔴 daily digests to the whole family — no app to install.",
  },
  {
    icon: Bell,
    title: "Instant escalation",
    description: "Falls, chest pain, or distress trigger an immediate caregiver alert.",
  },
  {
    icon: Brain,
    title: "AI health insights",
    description: "30-day mood and wellbeing trends surface changes before they become emergencies.",
  },
  {
    icon: Settings2,
    title: "Custom monitoring",
    description: "Add your own questions — BP, meals, sleep, physio, anything.",
  },
  {
    icon: ShieldCheck,
    title: "Private &amp; DPDP-safe",
    description: "Data stays yours. Delete anything, anytime. No ads. Ever.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-14">
          <p className="text-xs tracking-[0.2em] uppercase text-primary/70 mb-4">What Sentio does</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-[1.05]">
            Everything a good caregiver would.
            <span className="italic text-primary"> Every single day.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl">
          {features.map((f, i) => (
            <Card
              key={i}
              className={`group relative p-6 bg-card border border-border rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 ${f.span ?? ""}`}
            >
              <div className={`w-11 h-11 rounded-xl bg-primary/[0.08] text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className={`font-serif text-foreground mb-2 ${f.tall ? "text-3xl" : "text-xl"}`}>
                {f.title}
              </h3>
              <p className={`text-muted-foreground leading-relaxed ${f.tall ? "text-base" : "text-sm"}`}>
                {f.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
