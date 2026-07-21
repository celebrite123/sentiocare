import { UserPlus, Phone, MessageSquare } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Add your parent",
    description: "Two-minute setup. Enter medicines, timings, and the family members we should alert.",
  },
  {
    number: "02",
    icon: Phone,
    title: "We call every morning",
    description: "A warm AI voice in Hindi or English checks on medicines, mood, sleep, and symptoms.",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "You get a WhatsApp update",
    description: "Green, yellow, or red — a clear daily summary. Instant escalation for anything urgent.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-primary/70 mb-4">How Sentio works</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-[1.05]">
            Three quiet steps.
            <br />
            <span className="italic text-primary">One less thing to worry about.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative bg-card rounded-2xl border border-border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/[0.08] text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="font-serif text-3xl text-secondary/70">{step.number}</span>
              </div>
              <h3 className="font-serif text-2xl text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
