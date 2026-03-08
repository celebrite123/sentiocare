import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Shield, Heart, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroElderlyCouple from "@/assets/hero-elderly-couple.png";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-50" />
      
      {/* Gradient orbs - using brand colors */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 text-center lg:text-left">
            {/* Badge */}
            <div className="animate-fade-in">
              <Badge variant="secondary" className="bg-secondary/10 text-secondary border-0 px-4 py-1.5 text-sm font-medium">
                🇮🇳 Made in India • Now in Early Access
              </Badge>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight animate-fade-in animation-delay-100">
              <span className="text-foreground">Your Parents Are Safe.</span>
              <br />
              <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
                We Check Every Day.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl animate-fade-in animation-delay-200 leading-relaxed">
              AI calls your elderly parents daily in <strong>Hindi & English</strong>. 
              Instant WhatsApp alerts if something's wrong. No app. No wearable. Just peace of mind — <strong>₹699/month</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4 animate-fade-in animation-delay-300">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-12 px-6 rounded-full group shadow-lg shadow-primary/25"
                onClick={() => navigate("/auth")}
              >
                Join Waitlist
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
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 pt-6 animate-fade-in animation-delay-400">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground/80">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-secondary" />
                </div>
                <span className="text-sm font-medium text-foreground/80">5-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground/80">24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative animate-fade-in animation-delay-200 hidden lg:block">
            <div className="relative">
              {/* Decorative background elements */}
              <div className="absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-secondary/15 rounded-full blur-2xl" />
              
              {/* Main image container */}
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-primary/10">
                <img 
                  src={heroElderlyCouple} 
                  alt="Happy elderly Indian couple using smartphone for health check-ins"
                  className="w-full h-auto object-cover"
                  width={600}
                  height={400}
                  fetchPriority="high"
                />
              </div>
              
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 z-20 bg-card border border-border rounded-2xl p-4 shadow-lg animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-whatsapp/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-whatsapp" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground/70">Today's Status</p>
                    <p className="text-sm font-semibold text-foreground">All is Well ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-hint hidden md:block">
          <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-primary/50 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
