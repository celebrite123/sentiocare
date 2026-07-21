import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 1200, label: "Daily check-ins delivered", suffix: "+" },
  { value: 98, label: "Call answer rate", suffix: "%" },
  { value: 30, label: "Median alert time", prefix: "<", suffix: "s" },
  { value: 4.9, label: "Family satisfaction", suffix: "/5", isDecimal: true },
];

const AnimatedCounter = ({
  value,
  suffix,
  prefix,
  isDecimal,
}: {
  value: number;
  suffix: string;
  prefix?: string;
  isDecimal?: boolean;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1600;
          const steps = 50;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, isDecimal]);

  return (
    <div ref={ref} className="font-serif text-4xl md:text-5xl text-foreground leading-none">
      {prefix}
      {isDecimal ? count.toFixed(1) : count.toLocaleString()}
      <span className="text-secondary">{suffix}</span>
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-16 bg-muted/40 border-y border-border/60">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center md:text-left">
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                prefix={(stat as any).prefix}
                isDecimal={stat.isDecimal}
              />
              <p className="text-sm text-muted-foreground mt-2 max-w-[16ch] mx-auto md:mx-0">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
