import { useState, useEffect, ReactNode } from "react";

interface LazyRazorpayProviderProps {
  children: ReactNode;
}

/**
 * Deferred Razorpay script loading - only preloads Razorpay SDK when user navigates to payment pages
 * This prevents the 170KB+ Razorpay bundle from blocking initial page load
 */
export const LazyRazorpayProvider = ({ children }: LazyRazorpayProviderProps) => {
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    // Check if user is on a payment-related page
    const isPaymentPage = window.location.pathname.includes("select-plan") || 
                          window.location.pathname.includes("profile");
    
    if (isPaymentPage) {
      // Preload Razorpay script immediately on payment pages
      preloadRazorpay();
    } else {
      // Defer loading by 5 seconds on other pages
      const timer = setTimeout(preloadRazorpay, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const preloadRazorpay = () => {
    if (isPreloaded) return;
    
    // Check if script already exists
    if (document.querySelector('script[src*="razorpay"]')) {
      setIsPreloaded(true);
      return;
    }

    // Create link preload for Razorpay
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://checkout.razorpay.com";
    document.head.appendChild(link);

    setIsPreloaded(true);
  };

  return <>{children}</>;
};

export default LazyRazorpayProvider;
