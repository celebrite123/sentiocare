import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { value: 100, label: "answer rate", suffix: "%", description: "Every call answered" },
  { value: 15, label: "languages", suffix: "+", description: "Hindi, English & more" },
  { value: 24, label: "availability", suffix: "/7", description: "Around the clock care" },
  { value: 14, label: "day trial", suffix: "", description: "Risk-free start" },
];

const AnimatedCounter = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground">
      {count.toLocaleString()}{suffix}
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-secondary/10 text-secondary border-0 px-3 py-1">
            Built for Care
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Built for high-volume care
          </h2>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center group p-6 rounded-2xl transition-all duration-300 hover:bg-muted/50"
              >
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <p className="text-primary font-semibold text-lg mt-2 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
