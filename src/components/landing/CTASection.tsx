import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Shield, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      <div className="absolute top-10 left-10 w-20 h-20 text-primary/20 animate-float">
        <Heart className="w-full h-full" />
      </div>
      <div className="absolute bottom-10 right-10 w-16 h-16 text-secondary/20 animate-float-delayed">
        <Shield className="w-full h-full" />
      </div>
      <div className="absolute top-1/2 right-1/4 w-12 h-12 text-accent/20 animate-float-slow">
        <Phone className="w-full h-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to Give Your Parents
            <br />
            <span className="text-primary">The Care They Deserve?</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Join 500+ families who trust Sentio AI for daily elder care.
            <br />
            Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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
              className="text-lg h-14 px-8"
              onClick={() => navigate("/elders")}
            >
              View Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required • Cancel anytime • 24/7 support
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
