import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FloatingElements from "./FloatingElements";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <FloatingElements />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="animate-fade-in">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-4 py-2 text-sm">
              🇮🇳 Trusted by 500+ Indian Families
            </Badge>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in animation-delay-100">
            <span className="bg-gradient-hero bg-clip-text text-transparent animate-gradient">
              AI That Cares
            </span>
            <br />
            <span className="text-foreground">Like Family</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-fade-in animation-delay-200">
            Daily voice calls and WhatsApp check-ins for your elderly loved ones. 
            <span className="text-foreground font-medium"> Get instant alerts</span> when something's not right.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in animation-delay-300">
            <Button
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-lg h-14 px-8 group"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-14 px-8 group"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 animate-fade-in animation-delay-400">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-sm">100% Secure</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm">50,000+ Check-ins</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5 text-secondary" />
              <span className="text-sm">24/7 Monitoring</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-gentle">
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-scroll-down" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
