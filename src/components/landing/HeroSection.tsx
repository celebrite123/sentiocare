import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroElderlyCouple from "@/assets/hero-elderly-couple.png";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Editorial cream gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/40" aria-hidden="true" />
      <div className="absolute -top-32 -right-32 w-[560px] h-[560px] bg-primary/[0.06] rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] bg-secondary/[0.10] rounded-full blur-3xl" aria-hidden="true" />

      <div className="container relative mx-auto px-4 pt-10 pb-16 md:pt-20 md:pb-24">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left — editorial column */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/[0.06] border border-primary/15 text-primary text-xs font-medium tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Doctor-designed · Made in India
            </div>

            <h1 className="font-serif text-[2.75rem] sm:text-6xl lg:text-[4.5rem] leading-[0.98] tracking-tight text-foreground">
              Your parents are never
              <br />
              <span className="italic text-primary">alone on the call.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Sentio calls your elderly parents every day in Hindi &amp; English, tracks their medicines and mood, and sends the family a WhatsApp summary. No app. No wearable. Just quiet peace of mind.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-14 px-8 rounded-full group shadow-elegant"
                onClick={() => navigate("/auth")}
              >
                Join the waitlist
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-14 px-8 rounded-full border-foreground/15 hover:bg-foreground/[0.03] hover:border-foreground/25"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="mr-2 h-4 w-4 text-secondary" />
                Hear a real call
              </Button>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 pt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> DPDP-compliant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-secondary" /> 30-day free trial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" /> Hindi + English
              </span>
            </div>
          </div>

          {/* Right — portrait + call card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -top-6 -left-6 w-40 h-40 rounded-full bg-secondary/25 blur-2xl" aria-hidden="true" />
            <div className="absolute -bottom-6 -right-6 w-56 h-56 rounded-full bg-primary/15 blur-2xl" aria-hidden="true" />

            <div className="relative rounded-[2rem] overflow-hidden border border-foreground/10 shadow-elegant bg-card">
              <img
                src={heroElderlyCouple}
                alt="An elderly Indian couple smiling on a warm morning call"
                className="w-full h-auto object-cover aspect-[4/5]"
                width={640}
                height={800}
                fetchPriority="high"
              />
              {/* editorial gold rule */}
              <div className="absolute top-6 left-6 right-6 flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-white/90">
                <span className="h-px flex-1 bg-white/50" />
                Today · 8:30 AM
                <span className="h-px flex-1 bg-white/50" />
              </div>
            </div>

            {/* Floating call card */}
            <div className="absolute -bottom-6 left-4 sm:-left-6 right-4 sm:right-auto sm:w-80 rounded-2xl bg-card border border-border shadow-lg p-4 animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">AI check-in · connected</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    "आज दवाई ली? कैसा महसूस हो रहा है?"
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 h-6" aria-hidden="true">
                {[6, 14, 10, 18, 8, 22, 12, 16, 9, 20, 11, 15].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-primary/70 animate-wave"
                    style={{ height: `${h}px`, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
