import { UserPlus, Bot, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Add Your Loved One",
    description: "Enter their details, medical conditions, and preferred check-in times. Setup takes just 2 minutes.",
    color: "primary",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI Connects Daily",
    description: "Our AI makes caring voice calls and WhatsApp messages, asking about health, medicines, and wellbeing.",
    color: "secondary",
  },
  {
    number: "03",
    icon: Bell,
    title: "Stay Informed",
    description: "Receive instant alerts if something needs attention. View health trends and conversation summaries anytime.",
    color: "accent",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-0 px-3 py-1">
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            3 Simple Steps
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started in minutes and give your family peace of mind
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connecting line - enhanced gradient */}
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-primary via-secondary to-accent opacity-30" />
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center group">
                  {/* Step number circle - enhanced */}
                  <div className="relative inline-flex mb-6">
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${
                      step.color === 'primary' ? 'bg-primary' : 
                      step.color === 'secondary' ? 'bg-secondary' : 'bg-accent'
                    }`} />
                    
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                      step.color === 'primary' ? 'bg-primary/10 group-hover:bg-primary/20' : 
                      step.color === 'secondary' ? 'bg-secondary/10 group-hover:bg-secondary/20' : 
                      'bg-accent/10 group-hover:bg-accent/20'
                    }`}>
                      <step.icon className={`h-12 w-12 ${
                        step.color === 'primary' ? 'text-primary' : 
                        step.color === 'secondary' ? 'text-secondary' : 'text-accent'
                      }`} />
                    </div>
                    
                    {/* Step number badge */}
                    <span className={`absolute -top-2 -right-2 w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center shadow-lg ${
                      step.color === 'primary' ? 'bg-primary text-primary-foreground' : 
                      step.color === 'secondary' ? 'bg-secondary text-secondary-foreground' : 
                      'bg-accent text-accent-foreground'
                    }`}>
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
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
