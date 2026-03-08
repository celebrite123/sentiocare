import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 1200, label: "Check-ins Completed", suffix: "+" },
  { value: 98, label: "Call Success Rate", suffix: "%" },
  { value: 30, label: "Avg Alert Time", prefix: "<", suffix: "s" },
  { value: 4.9, label: "Family Rating", suffix: "★", isDecimal: true },
];

const AnimatedCounter = ({ value, suffix, prefix, isDecimal }: { value: number; suffix: string; prefix?: string; isDecimal?: boolean }) => {
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
              setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
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
  }, [value, isDecimal]);

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-bold text-foreground">
      {prefix}{isDecimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={(stat as any).prefix} isDecimal={stat.isDecimal} />
                <p className="text-foreground/70 text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
