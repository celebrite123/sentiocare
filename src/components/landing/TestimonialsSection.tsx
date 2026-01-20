import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Daughter, Mumbai",
    content: "Sentio AI gives me peace of mind while I'm at work. Knowing my mother gets a caring call every morning makes all the difference.",
    highlight: "peace of mind",
  },
  {
    name: "Rajesh Kumar",
    role: "Son, Bangalore",
    content: "My father actually looks forward to the daily calls. The AI is so natural, he thinks it's a real person checking on him.",
    highlight: "looks forward to the daily calls",
  },
  {
    name: "Anita Patel",
    role: "Daughter, Delhi",
    content: "The instant alerts saved us when my mother mentioned chest pain. We got her to the hospital quickly. Forever grateful.",
    highlight: "instant alerts saved us",
  },
  {
    name: "Suresh Reddy",
    role: "Son, Hyderabad",
    content: "Simple WhatsApp interface means my tech-shy parents can use it without any training. Brilliant design.",
    highlight: "tech-shy parents can use it",
  },
];

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] -translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-0 px-3 py-1">
            Trusted by Families
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Don't just take our word for it
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Hear from families who trust Sentio AI with their loved ones
          </p>
        </div>

        <div 
          className="max-w-3xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Card className="p-10 bg-card border-2 border-border relative">
            {/* Quote icon */}
            <div className="absolute -top-4 left-10">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Quote className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>

            {/* Quote */}
            <blockquote className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed font-medium">
              "{testimonials[current].content}"
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
                <span className="text-primary font-bold text-lg">
                  {testimonials[current].name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{testimonials[current].name}</p>
                <p className="text-muted-foreground">{testimonials[current].role}</p>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <Button variant="outline" size="icon" onClick={prev} className="rounded-full w-12 h-12 border-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    current === index ? "bg-primary w-8" : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={next} className="rounded-full w-12 h-12 border-2">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
