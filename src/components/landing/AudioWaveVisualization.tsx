interface AudioWaveVisualizationProps {
  isActive?: boolean;
  className?: string;
}

const AudioWaveVisualization = ({ isActive = true, className = "" }: AudioWaveVisualizationProps) => {
  const bars = 7; // Matches HelloPatient's design
  
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        // Create the characteristic pattern: low-mid-high-center-high-mid-low
        const baseHeight = i < bars / 2 
          ? 12 + (i * 8) 
          : 12 + ((bars - 1 - i) * 8);
        
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isActive ? 'bg-primary/80' : 'bg-muted-foreground/30'
            }`}
            style={{
              height: `${baseHeight}px`,
              animation: isActive 
                ? `wave ${0.6 + (i * 0.1)}s ease-in-out infinite` 
                : 'none',
              animationDelay: `${i * 0.08}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default AudioWaveVisualization;
