import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Daughter, Mumbai",
    content: "Sentio AI has been a blessing for our family. My mother lives alone and now I get daily updates about her health without disturbing her routine.",
    avatar: "PS",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Son, Bangalore",
    content: "The voice calls are so natural that my father looks forward to them every day. It's like having a caring friend check on him.",
    avatar: "RK",
    rating: 5,
  },
  {
    name: "Anita Patel",
    role: "Daughter, Delhi",
    content: "The instant alerts saved us once when my mother forgot her heart medicine. We were able to remind her immediately. Worth every rupee!",
    avatar: "AP",
    rating: 5,
  },
  {
    name: "Suresh Reddy",
    role: "Son, Hyderabad",
    content: "Managing my parents' medicines from another city was so stressful. Now Sentio handles reminders and I just check the reports.",
    avatar: "SR",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const prev = () => goTo((currentIndex - 1 + testimonials.length) % testimonials.length);
  const next = () => goTo((currentIndex + 1) % testimonials.length);

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Loved by <span className="text-primary">Families</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Join hundreds of families who trust Sentio AI
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  className="min-w-full p-8 md:p-12 border-2 bg-card/50 backdrop-blur-sm"
                >
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button variant="outline" size="icon" onClick={prev} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentIndex ? "bg-primary w-8" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={next} className="rounded-full">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
