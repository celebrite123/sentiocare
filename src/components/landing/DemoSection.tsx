import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Play, Square, RotateCcw, Volume2, Loader2 } from "lucide-react";
import { useDemoAudio } from "@/hooks/useDemoAudio";

// Authentic Hindi conversations - natural, warm, family-like
const whatsappMessagesHindi = [
  { role: "ai" as const, text: "नमस्ते दादी जी! 🙏 आज सुबह की दवाई ली आपने?", delay: 0 },
  { role: "elder" as const, text: "हां बेटा, BP की गोली ले ली", delay: 2500 },
  { role: "ai" as const, text: "बहुत अच्छा! तबीयत कैसी है आज?", delay: 4500 },
  { role: "elder" as const, text: "ठीक हूं, आज पोहा खाया नाश्ते में", delay: 7000 },
  { role: "ai" as const, text: "वाह! आप अपना ख्याल रखिए। परिवार को बता देती हूं कि सब ठीक है। 💚", delay: 9000 },
];

const whatsappMessagesEnglish = [
  { role: "ai" as const, text: "Good morning! 🙏 Did you take your morning medicines?", delay: 0 },
  { role: "elder" as const, text: "Yes dear, I took my BP tablet", delay: 2500 },
  { role: "ai" as const, text: "That's wonderful! How are you feeling today?", delay: 4500 },
  { role: "elder" as const, text: "Feeling good, had poha for breakfast", delay: 7000 },
  { role: "ai" as const, text: "Lovely! Take care, I'll let your family know you're doing well. 💚", delay: 9000 },
];

// Voice call - realistic elder check-in conversation
const voiceCallScriptHindi = [
  { role: "ai" as const, text: "नमस्ते दादी जी! कैसी तबीयत है आज?", delay: 0 },
  { role: "elder" as const, text: "ठीक हूं बेटा, बस थोड़ी कमज़ोरी लग रही है।", delay: 2500 },
  { role: "ai" as const, text: "अच्छा, 1 से 10 में कितनी कमज़ोरी है?", delay: 5000 },
  { role: "elder" as const, text: "3-4 होगी, ज़्यादा नहीं।", delay: 7500 },
  { role: "ai" as const, text: "ठीक है। आराम कीजिए, मैं परिवार को बता देती हूं। दवाई ज़रूर लीजिएगा।", delay: 9500 },
];

const voiceCallScriptEnglish = [
  { role: "ai" as const, text: "Hello! How are you feeling today?", delay: 0 },
  { role: "elder" as const, text: "I'm okay dear, just feeling a bit weak.", delay: 2500 },
  { role: "ai" as const, text: "I see. From 1 to 10, how weak do you feel?", delay: 5000 },
  { role: "elder" as const, text: "Maybe 3 or 4, not too bad.", delay: 7500 },
  { role: "ai" as const, text: "Alright. Please rest well, I'll let your family know. Don't forget your medicines.", delay: 9500 },
];

const DemoSection = () => {
  const [language, setLanguage] = useState<"english" | "hindi">("hindi");
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [whatsappComplete, setWhatsappComplete] = useState(false);
  const [voiceComplete, setVoiceComplete] = useState(false);

  const whatsappMessages = language === "hindi" ? whatsappMessagesHindi : whatsappMessagesEnglish;
  const voiceCallScript = language === "hindi" ? voiceCallScriptHindi : voiceCallScriptEnglish;

  const whatsappAudio = useDemoAudio({
    language,
    messages: whatsappMessages,
    demoType: 'whatsapp',
    onMessageComplete: setWhatsappIndex,
    onComplete: () => setWhatsappComplete(true),
  });

  const voiceAudio = useDemoAudio({
    language,
    messages: voiceCallScript,
    demoType: 'voice',
    onMessageComplete: setVoiceIndex,
    onComplete: () => setVoiceComplete(true),
  });

  const toggleLanguage = useCallback((newLang: "english" | "hindi") => {
    if (newLang !== language) {
      // Stop any playing audio
      whatsappAudio.stop();
      voiceAudio.stop();
      // Reset state
      setLanguage(newLang);
      setWhatsappIndex(0);
      setVoiceIndex(0);
      setWhatsappComplete(false);
      setVoiceComplete(false);
    }
  }, [language, whatsappAudio, voiceAudio]);

  const resetDemo = useCallback(() => {
    whatsappAudio.stop();
    voiceAudio.stop();
    setWhatsappIndex(0);
    setVoiceIndex(0);
    setWhatsappComplete(false);
    setVoiceComplete(false);
  }, [whatsappAudio, voiceAudio]);

  return (
    <section id="demo" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            See Sentio In Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Click play to hear how Sentio AI conducts caring check-ins with your loved ones
          </p>
          
          {/* Language Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
            <Button
              variant={language === "hindi" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("hindi")}
              className="rounded-full px-4"
            >
              हिन्दी
            </Button>
            <Button
              variant={language === "english" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("english")}
              className="rounded-full px-4"
            >
              English
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* WhatsApp Demo */}
          <DemoCard
            icon={<MessageCircle className="h-5 w-5 text-accent" />}
            iconBg="bg-accent/10"
            title="WhatsApp Check-in"
            subtitle="Daily text conversation"
            headerBg="bg-accent"
            messages={whatsappMessages}
            displayedCount={whatsappIndex}
            isPlaying={whatsappAudio.isPlaying}
            isLoading={whatsappAudio.isLoading}
            isComplete={whatsappComplete}
            onPlay={whatsappAudio.play}
            onStop={whatsappAudio.stop}
            language={language}
            type="whatsapp"
          />

          {/* Voice Call Demo */}
          <DemoCard
            icon={<Phone className="h-5 w-5 text-secondary" />}
            iconBg="bg-secondary/10"
            title="Voice Call Check-in"
            subtitle="Personalized phone call"
            headerBg="bg-foreground"
            messages={voiceCallScript}
            displayedCount={voiceIndex}
            isPlaying={voiceAudio.isPlaying}
            isLoading={voiceAudio.isLoading}
            isComplete={voiceComplete}
            onPlay={voiceAudio.play}
            onStop={voiceAudio.stop}
            language={language}
            type="voice"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={resetDemo}
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {language === "hindi" ? "फिर से देखें" : "Reset Demo"}
          </Button>
        </div>
      </div>
    </section>
  );
};

interface DemoCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  headerBg: string;
  messages: Array<{ role: 'ai' | 'elder'; text: string }>;
  displayedCount: number;
  isPlaying: boolean;
  isLoading: boolean;
  isComplete: boolean;
  onPlay: () => void;
  onStop: () => void;
  language: 'hindi' | 'english';
  type: 'whatsapp' | 'voice';
}

const DemoCard = ({
  icon,
  iconBg,
  title,
  subtitle,
  headerBg,
  messages,
  displayedCount,
  isPlaying,
  isLoading,
  isComplete,
  onPlay,
  onStop,
  language,
  type,
}: DemoCardProps) => {
  const showPlayOverlay = !isPlaying && displayedCount === 0 && !isComplete;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      
      <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg relative">
        {/* Phone header */}
        <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
              {type === 'whatsapp' ? 'S' : <Phone className="h-4 w-4" />}
            </div>
            <div className="text-white">
              <p className="font-medium text-sm">{type === 'whatsapp' ? 'Sentio' : 'Sentio Call'}</p>
              <p className="text-xs text-white/70">
                {isPlaying 
                  ? (language === "hindi" ? "चालू है..." : "Playing...") 
                  : (language === "hindi" ? "क्लिक करें" : "Click to play")}
              </p>
            </div>
          </div>
          
          {/* Play/Stop button in header */}
          <Button
            size="sm"
            variant="ghost"
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            className="text-white hover:bg-white/20"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Content area */}
        <div className={`p-4 min-h-[300px] ${type === 'whatsapp' ? 'space-y-3 bg-muted/20' : 'space-y-4'}`}>
          {/* Play overlay */}
          {showPlayOverlay && (
            <div className="absolute inset-0 top-[52px] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Button
                size="lg"
                onClick={onPlay}
                disabled={isLoading}
                className="rounded-full h-16 w-16 mb-3"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                {language === "hindi" ? "सुनने के लिए क्लिक करें" : "Click to hear demo"}
              </p>
            </div>
          )}

          {type === 'whatsapp' ? (
            // WhatsApp style messages
            <>
              {messages.slice(0, displayedCount).map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "elder" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
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
                  <div className="bg-card border border-border px-4 py-2 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Voice call transcript style
            <>
              {/* Audio waveform visualization */}
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-center justify-center gap-1">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isPlaying ? 'bg-secondary animate-pulse' : 'bg-secondary/40'
                      }`}
                      style={{
                        height: isPlaying ? `${12 + Math.sin(i * 0.5) * 8}px` : '8px',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === "hindi" ? "📞 वॉइस ट्रांसक्रिप्ट" : "📞 Voice Transcript"}
                </p>
              </div>
              
              {/* Transcript */}
              <div className="space-y-3">
                {messages.slice(0, displayedCount).map((msg, index) => (
                  <div key={index} className="animate-fade-in">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      {msg.role === "ai" ? "Sentio" : (language === "hindi" ? "दादी जी" : "Elder")}
                    </p>
                    <p className={`text-sm ${msg.role === "ai" ? "text-foreground" : "text-muted-foreground italic"}`}>
                      "{msg.text}"
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DemoSection;
