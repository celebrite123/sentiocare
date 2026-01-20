import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WaveBackground from "./WaveBackground";
import AudioWaveVisualization from "./AudioWaveVisualization";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-[hsl(183_30%_12%)] via-[hsl(183_35%_15%)] to-[hsl(183_25%_18%)]">
      {/* Wave background animation */}
      <WaveBackground />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in mb-8">
            <Badge className="bg-secondary/20 text-secondary border border-secondary/30 px-4 py-1.5 text-sm font-medium">
              🇮🇳 Made in India • Now in Early Access
            </Badge>
          </div>
          
          {/* Main Headline - Centered, bold like HelloPatient */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in animation-delay-100 text-white mb-6">
            Care for your elders.
            <br />
            <span className="text-primary-foreground/90">Peace of mind for you.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto animate-fade-in animation-delay-200 leading-relaxed mb-10">
            The AI-powered companion that checks on your elderly parents daily through 
            voice calls and WhatsApp—in <span className="text-secondary font-medium">Hindi</span> and <span className="text-primary font-medium">English</span>.
          </p>

          {/* Audio Wave Visualization - Like HelloPatient's "Meet Mia" */}
          <div className="flex flex-col items-center gap-4 mb-10 animate-fade-in animation-delay-300">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl scale-150" />
              <div className="relative p-6 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30">
                <AudioWaveVisualization className="h-12" />
              </div>
            </div>
            <p className="text-sm uppercase tracking-widest text-primary/80 font-medium">
              Meet Sentio
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-400">
            <Button
              size="lg"
              className="bg-white text-foreground hover:bg-white/90 text-base h-14 px-8 rounded-full group shadow-xl shadow-white/10 font-semibold"
              onClick={() => navigate("/auth")}
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Talking
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-base h-14 px-8 rounded-full group border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-medium"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See Demo
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-12 animate-fade-in animation-delay-500">
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span className="text-sm font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <span className="text-sm font-medium">14-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
              </div>
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
