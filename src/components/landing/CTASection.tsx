import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AudioWaveVisualization from "./AudioWaveVisualization";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-b from-[hsl(183_30%_12%)] via-[hsl(183_35%_15%)] to-[hsl(183_25%_18%)] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Audio visualization */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl scale-150" />
              <div className="relative p-5 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30">
                <AudioWaveVisualization className="h-10" />
              </div>
            </div>
          </div>
          
          <p className="text-sm uppercase tracking-widest text-primary/80 font-medium mb-6">
            let sentio handle it
          </p>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Give Your Parents the Care They Deserve
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Try Sentio AI free for 14 days. Daily voice calls and WhatsApp check-ins 
            for your elderly parents. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-foreground hover:bg-white/90 text-base h-14 px-8 rounded-full group shadow-xl shadow-white/10 font-semibold"
              onClick={() => navigate("/auth")}
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-14 px-8 rounded-full border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-medium"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>

          <p className="text-sm text-white/50 mt-8">
            No credit card required • Cancel anytime • 24/7 support
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
