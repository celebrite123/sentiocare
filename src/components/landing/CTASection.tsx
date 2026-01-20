import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Give Your Parents the Care They Deserve
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Try Sentio AI free for 5 days. Daily voice calls and WhatsApp check-ins 
            for your elderly parents. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base h-12 px-8 rounded-full group shadow-lg shadow-secondary/25"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 rounded-full border-primary/50 hover:bg-primary/10 hover:border-primary"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Cancel anytime • 24/7 support
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
