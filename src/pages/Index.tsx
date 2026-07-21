import { lazy, Suspense, memo, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const DemoSection = lazy(() => import("@/components/landing/DemoSection"));
const B2BSection = lazy(() => import("@/components/landing/B2BSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));

const SectionLoader = memo(() => <div className="min-h-[200px]" aria-hidden="true" />);

const StickyMobileCTA = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur border-t border-border md:hidden">
      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-full text-base font-semibold shadow-elegant group"
        onClick={() => navigate("/auth")}
      >
        Join the waitlist
        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <Suspense fallback={<SectionLoader />}>
          <div id="demo">
            <DemoSection />
          </div>
        </Suspense>
        <HowItWorks />
        <div id="features">
          <FeaturesSection />
        </div>
        <Suspense fallback={<SectionLoader />}>
          <TestimonialsSection />
        </Suspense>
        <div id="pricing">
          <PricingSection />
        </div>
        <Suspense fallback={<SectionLoader />}>
          <B2BSection />
        </Suspense>
        <div id="faq">
          <FAQSection />
        </div>
        <CTASection />
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
};

export default Index;
