import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Daughter, Mumbai",
    content: "Sentio AI gives me peace of mind while I'm at work. Knowing my mother gets a caring call every morning makes all the difference.",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Son, Bangalore",
    content: "My father actually looks forward to the daily calls. The AI is so natural, he thinks it's a real person checking on him.",
    rating: 5,
  },
  {
    name: "Anita Patel",
    role: "Daughter, Delhi",
    content: "The instant alerts saved us when my mother mentioned chest pain. We got her to the hospital quickly. Forever grateful.",
    rating: 5,
  },
  {
    name: "Suresh Reddy",
    role: "Son, Hyderabad",
    content: "Simple WhatsApp interface means my tech-shy parents can use it without any training. Brilliant design.",
    rating: 5,
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
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Families Say
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Hear from families who trust Sentio AI with their loved ones
          </p>
        </div>

        <div 
          className="max-w-2xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Card className="p-8 bg-card border border-border">
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(testimonials[current].rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-warning text-warning" />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-lg text-foreground mb-6 leading-relaxed">
              "{testimonials[current].content}"
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {testimonials[current].name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{testimonials[current].name}</p>
                <p className="text-sm text-foreground/70">{testimonials[current].role}</p>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button variant="ghost" size="icon" onClick={prev} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    current === index ? "bg-primary w-6" : "bg-foreground/30"
                  }`}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={next} className="rounded-full">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;