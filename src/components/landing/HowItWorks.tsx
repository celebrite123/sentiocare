import { UserPlus, Bot, Bell } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Add Your Loved One",
    description: "Enter their details, medical conditions, and preferred check-in times. Setup takes just 2 minutes.",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI Connects Daily",
    description: "Our AI makes caring voice calls and WhatsApp messages, asking about health, medicines, and wellbeing.",
  },
  {
    number: "03",
    icon: Bell,
    title: "Stay Informed",
    description: "Receive instant alerts if something needs attention. View health trends and conversation summaries anytime.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            3 Simple Steps
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Get started in minutes and give your family peace of mind
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border" />
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center group">
                  {/* Step number circle */}
                  <div className="relative inline-flex mb-6">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                      <step.icon className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-foreground/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;