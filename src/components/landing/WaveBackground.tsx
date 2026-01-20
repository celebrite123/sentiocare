import { useEffect, useRef } from "react";

interface WaveBackgroundProps {
  className?: string;
}

const WaveBackground = ({ className = "" }: WaveBackgroundProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Animated wave lines like HelloPatient */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[400px]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wave 1 - Primary teal */}
        <path
          d="M0 200 Q 360 100, 720 200 T 1440 200"
          stroke="hsl(183 45% 42% / 0.3)"
          strokeWidth="2"
          fill="none"
          className="animate-wave-slow"
        />
        {/* Wave 2 - Secondary orange/amber */}
        <path
          d="M0 220 Q 360 300, 720 220 T 1440 220"
          stroke="hsl(36 91% 55% / 0.25)"
          strokeWidth="2"
          fill="none"
          className="animate-wave-medium"
        />
        {/* Wave 3 - Accent teal */}
        <path
          d="M0 250 Q 360 150, 720 250 T 1440 250"
          stroke="hsl(183 40% 55% / 0.2)"
          strokeWidth="1.5"
          fill="none"
          className="animate-wave-fast"
        />
      </svg>
      
      {/* Gradient orbs */}
      <div className="absolute top-20 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] animate-pulse-soft" />
      <div className="absolute bottom-40 left-1/4 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[120px] animate-pulse-soft animation-delay-500" />
    </div>
  );
};

export default WaveBackground;
