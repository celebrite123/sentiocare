import { lazy, Suspense, memo } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";

// Lazy load below-the-fold components for faster initial render
const StatsSection = lazy(() => import("@/components/landing/StatsSection"));
const DemoSection = lazy(() => import("@/components/landing/DemoSection"));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks"));
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const B2BSection = lazy(() => import("@/components/landing/B2BSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const CTASection = lazy(() => import("@/components/landing/CTASection"));
const Footer = lazy(() => import("@/components/landing/Footer"));

// Minimal loading placeholder - prevents layout shift
const SectionLoader = memo(() => <div className="min-h-[200px]" aria-hidden="true" />);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={<SectionLoader />}>
          <StatsSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <DemoSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FeaturesSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <TestimonialsSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <PricingSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <B2BSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <FAQSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <CTASection />
        </Suspense>
      </main>
      <Suspense fallback={<SectionLoader />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
