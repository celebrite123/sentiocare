import { UserPlus, Bot, Bell } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Add Your Elder",
    description: "Enter their details, medical conditions, and medicines. Takes just 2 minutes.",
    color: "primary",
  },
  {
    icon: Bot,
    title: "AI Connects Daily",
    description: "Sentio calls or messages at scheduled times to check on health and medicines.",
    color: "secondary",
  },
  {
    icon: Bell,
    title: "Stay Informed",
    description: "Get instant alerts if something seems off. View detailed health reports anytime.",
    color: "accent",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple as <span className="text-primary">1-2-3</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started in minutes, not hours
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />

            {steps.map((step, index) => (
              <div
                key={index}
                className="relative text-center group animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-sm font-bold text-muted-foreground z-10">
                  {index + 1}
                </div>

                {/* Icon Container */}
                <div
                  className={`mx-auto w-32 h-32 rounded-3xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 ${
                    step.color === "primary"
                      ? "bg-primary/10"
                      : step.color === "secondary"
                      ? "bg-secondary/10"
                      : "bg-accent/10"
                  }`}
                >
                  <step.icon
                    className={`h-12 w-12 ${
                      step.color === "primary"
                        ? "text-primary"
                        : step.color === "secondary"
                        ? "text-secondary"
                        : "text-accent"
                    }`}
                  />
                </div>

                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
