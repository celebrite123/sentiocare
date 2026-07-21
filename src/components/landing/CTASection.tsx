import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-accent p-10 md:p-16 text-center shadow-elegant">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/25 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-secondary/15 blur-3xl" aria-hidden="true" />

          <div className="relative max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.2em] uppercase text-secondary mb-5">Limited spots each week</p>
            <h2 className="font-serif text-4xl md:text-6xl text-primary-foreground leading-[1.02] mb-5">
              Bring Sentio home
              <br />
              <span className="italic text-secondary">this week.</span>
            </h2>
            <p className="text-primary-foreground/85 text-lg mb-8 max-w-lg mx-auto">
              Join the waitlist today. We approve new families every few days and start your 30-day free trial the moment you're in.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base h-14 px-8 rounded-full group shadow-gold"
                onClick={() => navigate("/auth")}
              >
                Join the waitlist
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-14 px-8 rounded-full bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              >
                Hear how it sounds
              </Button>
            </div>

            <p className="text-sm text-primary-foreground/70 mt-6">
              30-day free trial on approval · Cancel anytime · No app required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
