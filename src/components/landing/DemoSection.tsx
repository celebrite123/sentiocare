import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Play, Square, RotateCcw, Volume2, Loader2 } from "lucide-react";
import { useDemoAudio } from "@/hooks/useDemoAudio";

// WhatsApp messages - text only, no audio
const whatsappMessagesHindi = [
  { role: "ai" as const, text: "नमस्ते दादी जी! 🙏 आज सुबह की दवाई ली आपने?" },
  { role: "elder" as const, text: "हां बेटा, BP की गोली ले ली" },
  { role: "ai" as const, text: "बहुत अच्छा! तबीयत कैसी है आज?" },
  { role: "elder" as const, text: "ठीक हूं, आज पोहा खाया नाश्ते में" },
  { role: "ai" as const, text: "वाह! आप अपना ख्याल रखिए। परिवार को बता देती हूं कि सब ठीक है। 💚" },
];

const whatsappMessagesEnglish = [
  { role: "ai" as const, text: "Good morning! 🙏 Did you take your morning medicines?" },
  { role: "elder" as const, text: "Yes dear, I took my BP tablet" },
  { role: "ai" as const, text: "That's wonderful! How are you feeling today?" },
  { role: "elder" as const, text: "Feeling good, had poha for breakfast" },
  { role: "ai" as const, text: "Lovely! Take care, I'll let your family know you're doing well. 💚" },
];

// Voice call script - with audio
const voiceCallScriptHindi = [
  { role: "ai" as const, text: "नमस्ते दादी जी! कैसी तबीयत है आज?" },
  { role: "elder" as const, text: "ठीक हूं बेटा, बस थोड़ी कमज़ोरी लग रही है।" },
  { role: "ai" as const, text: "अच्छा, 1 से 10 में कितनी कमज़ोरी है?" },
  { role: "elder" as const, text: "3-4 होगी, ज़्यादा नहीं।" },
  { role: "ai" as const, text: "ठीक है। आराम कीजिए, मैं परिवार को बता देती हूं। दवाई ज़रूर लीजिएगा।" },
];

const voiceCallScriptEnglish = [
  { role: "ai" as const, text: "Hello! How are you feeling today?" },
  { role: "elder" as const, text: "I'm okay dear, just feeling a bit weak." },
  { role: "ai" as const, text: "I see. From 1 to 10, how weak do you feel?" },
  { role: "elder" as const, text: "Maybe 3 or 4, not too bad." },
  { role: "ai" as const, text: "Alright. Please rest well, I'll let your family know. Don't forget your medicines." },
];

const DemoSection = () => {
  const [language, setLanguage] = useState<"english" | "hindi">("hindi");
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [whatsappPlaying, setWhatsappPlaying] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [voiceComplete, setVoiceComplete] = useState(false);

  const whatsappMessages = language === "hindi" ? whatsappMessagesHindi : whatsappMessagesEnglish;
  const voiceCallScript = language === "hindi" ? voiceCallScriptHindi : voiceCallScriptEnglish;

  const voiceAudio = useDemoAudio({
    language,
    messages: voiceCallScript,
    demoType: 'voice',
    onMessageComplete: setVoiceIndex,
    onComplete: () => setVoiceComplete(true),
  });

  // Preload voice audio on mount
  useEffect(() => {
    voiceAudio.preload();
  }, [language]);

  // WhatsApp text animation - no audio
  const playWhatsApp = useCallback(() => {
    setWhatsappPlaying(true);
    setWhatsappIndex(0);
    
    whatsappMessages.forEach((_, index) => {
      setTimeout(() => {
        setWhatsappIndex(index + 1);
        if (index === whatsappMessages.length - 1) {
          setWhatsappPlaying(false);
        }
      }, (index + 1) * 1500);
    });
  }, [whatsappMessages]);

  const stopWhatsApp = useCallback(() => {
    setWhatsappPlaying(false);
  }, []);

  const toggleLanguage = useCallback((newLang: "english" | "hindi") => {
    if (newLang !== language) {
      stopWhatsApp();
      voiceAudio.stop();
      setLanguage(newLang);
      setWhatsappIndex(0);
      setVoiceIndex(0);
      setVoiceComplete(false);
    }
  }, [language, voiceAudio, stopWhatsApp]);

  const resetDemo = useCallback(() => {
    stopWhatsApp();
    voiceAudio.stop();
    setWhatsappIndex(0);
    setVoiceIndex(0);
    setVoiceComplete(false);
  }, [voiceAudio, stopWhatsApp]);

  return (
    <section id="demo" className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            See Sentio In Action
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-4 md:mb-6">
            {language === "hindi" 
              ? "देखें कि Sentio AI कैसे आपके बुज़ुर्गों से बात करता है" 
              : "Watch how Sentio AI conducts caring check-ins"}
          </p>
          
          {/* Language Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
            <Button
              variant={language === "hindi" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("hindi")}
              className="rounded-full px-3 md:px-4 text-sm"
            >
              हिन्दी
            </Button>
            <Button
              variant={language === "english" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("english")}
              className="rounded-full px-3 md:px-4 text-sm"
            >
              English
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto">
          {/* WhatsApp Demo - Text Only */}
          <WhatsAppDemoCard
            messages={whatsappMessages}
            displayedCount={whatsappIndex}
            isPlaying={whatsappPlaying}
            onPlay={playWhatsApp}
            onStop={stopWhatsApp}
            language={language}
          />

          {/* Voice Call Demo - With Audio */}
          <VoiceCallDemoCard
            messages={voiceCallScript}
            displayedCount={voiceIndex}
            isPlaying={voiceAudio.isPlaying}
            isLoading={voiceAudio.isLoading}
            isComplete={voiceComplete}
            onPlay={voiceAudio.play}
            onStop={voiceAudio.stop}
            language={language}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-6 md:mt-8">
          <Button
            variant="outline"
            onClick={resetDemo}
            className="rounded-full text-sm"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {language === "hindi" ? "फिर से देखें" : "Reset Demo"}
          </Button>
        </div>
      </div>
    </section>
  );
};

// WhatsApp Demo - Text animation only, no audio
interface WhatsAppDemoCardProps {
  messages: Array<{ role: 'ai' | 'elder'; text: string }>;
  displayedCount: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  language: 'hindi' | 'english';
}

const WhatsAppDemoCard = ({
  messages,
  displayedCount,
  isPlaying,
  onPlay,
  onStop,
  language,
}: WhatsAppDemoCardProps) => {
  const showPlayOverlay = !isPlaying && displayedCount === 0;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm md:text-base">WhatsApp Check-in</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === "hindi" ? "रोज़ाना मैसेज" : "Daily text conversation"}
          </p>
        </div>
      </div>
      
      <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg relative">
        {/* WhatsApp header */}
        <div className="bg-accent px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs md:text-sm font-medium">
              S
            </div>
            <div className="text-white">
              <p className="font-medium text-xs md:text-sm">Sentio</p>
              <p className="text-[10px] md:text-xs text-white/70">online</p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={isPlaying ? onStop : onPlay}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            {isPlaying ? <Square className="h-3 w-3 md:h-4 md:w-4" /> : <Play className="h-3 w-3 md:h-4 md:w-4" />}
          </Button>
        </div>
        
        {/* Chat area */}
        <div className="p-3 md:p-4 space-y-2 md:space-y-3 min-h-[240px] md:min-h-[300px] bg-muted/20">
          {/* Play overlay */}
          {showPlayOverlay && (
            <div className="absolute inset-0 top-[44px] md:top-[52px] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Button
                size="lg"
                onClick={onPlay}
                className="rounded-full h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-3"
              >
                <Play className="h-5 w-5 md:h-6 md:w-6 ml-0.5" />
              </Button>
              <p className="text-xs md:text-sm text-muted-foreground">
                {language === "hindi" ? "डेमो देखें" : "Watch demo"}
              </p>
            </div>
          )}

          {messages.slice(0, displayedCount).map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "elder" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] md:max-w-[80%] px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm ${
                  msg.role === "elder"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isPlaying && displayedCount < messages.length && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-3 md:px-4 py-1.5 md:py-2 rounded-xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Voice Call Demo - With Audio
interface VoiceCallDemoCardProps {
  messages: Array<{ role: 'ai' | 'elder'; text: string }>;
  displayedCount: number;
  isPlaying: boolean;
  isLoading: boolean;
  isComplete: boolean;
  onPlay: () => void;
  onStop: () => void;
  language: 'hindi' | 'english';
}

const VoiceCallDemoCard = ({
  messages,
  displayedCount,
  isPlaying,
  isLoading,
  isComplete,
  onPlay,
  onStop,
  language,
}: VoiceCallDemoCardProps) => {
  const showPlayOverlay = !isPlaying && displayedCount === 0 && !isComplete;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary/10 flex items-center justify-center">
          <Phone className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm md:text-base">Voice Call Check-in</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === "hindi" ? "फ़ोन कॉल" : "Personalized phone call"}
          </p>
        </div>
      </div>
      
      <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg relative">
        {/* Call header */}
        <div className="bg-foreground px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center text-white">
              <Phone className="h-3 w-3 md:h-4 md:w-4" />
            </div>
            <div className="text-white">
              <p className="font-medium text-xs md:text-sm">Sentio Call</p>
              <p className="text-[10px] md:text-xs text-white/70">
                {isPlaying 
                  ? (language === "hindi" ? "चालू है..." : "Playing...") 
                  : (language === "hindi" ? "सुनें" : "Click to listen")}
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="h-3 w-3 md:h-4 md:w-4" />
            ) : (
              <Play className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </Button>
        </div>
        
        {/* Content area */}
        <div className="p-3 md:p-4 min-h-[240px] md:min-h-[300px]">
          {/* Play overlay */}
          {showPlayOverlay && (
            <div className="absolute inset-0 top-[44px] md:top-[52px] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Button
                size="lg"
                onClick={onPlay}
                disabled={isLoading}
                className="rounded-full h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-3"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 md:h-6 md:w-6 ml-0.5" />
                )}
              </Button>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                <Volume2 className="h-3 w-3 md:h-4 md:w-4" />
                {language === "hindi" ? "सुनने के लिए क्लिक करें" : "Click to hear demo"}
              </p>
            </div>
          )}

          {/* Audio waveform visualization */}
          <div className="flex flex-col items-center gap-2 py-3 md:py-4">
            <div className="flex items-center justify-center gap-0.5 md:gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 md:w-1 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-secondary animate-pulse' : 'bg-secondary/40'
                  }`}
                  style={{
                    height: isPlaying ? `${10 + Math.sin(i * 0.5) * 6}px` : '6px',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
              {language === "hindi" ? "📞 वॉइस ट्रांसक्रिप्ट" : "📞 Voice Transcript"}
            </p>
          </div>
          
          {/* Transcript */}
          <div className="space-y-2 md:space-y-3">
            {messages.slice(0, displayedCount).map((msg, index) => (
              <div key={index} className="animate-fade-in">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1 font-medium">
                  {msg.role === "ai" ? "Sentio" : (language === "hindi" ? "दादी जी" : "Elder")}
                </p>
                <p className={`text-xs md:text-sm ${msg.role === "ai" ? "text-foreground" : "text-muted-foreground italic"}`}>
                  "{msg.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DemoSection;
