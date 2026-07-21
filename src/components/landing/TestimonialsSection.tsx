import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

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
  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by Families Across India
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Hear from families who trust Sentio AI with their loved ones
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 bg-card border border-border hover:border-primary/30 transition-colors">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-foreground/80 mb-5 leading-relaxed line-clamp-4">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-semibold text-sm">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                  <p className="text-xs text-foreground/70">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
