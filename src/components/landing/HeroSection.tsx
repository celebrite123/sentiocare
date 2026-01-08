import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, Heart, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-50" />
      
      {/* Gradient orbs - using brand colors */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="animate-fade-in">
            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-0 px-4 py-1.5 text-sm font-medium">
              Trusted by 500+ Indian Families
            </Badge>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in animation-delay-100">
            <span className="text-foreground">AI-Powered Care</span>
            <br />
            <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
              For Your Loved Ones
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in animation-delay-200 leading-relaxed">
            Daily voice calls and WhatsApp check-ins for your elderly parents. 
            Get instant alerts when something needs your attention.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 animate-fade-in animation-delay-300">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-12 px-6 rounded-full group shadow-lg shadow-primary/25"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-base h-12 px-6 rounded-full group border-secondary/50 hover:bg-secondary/10 hover:border-secondary"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="mr-2 h-4 w-4 text-secondary" />
              Watch Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 animate-fade-in animation-delay-400">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-secondary" />
              </div>
              <span className="text-sm font-medium">50,000+ Check-ins</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-hint">
          <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary/50 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
