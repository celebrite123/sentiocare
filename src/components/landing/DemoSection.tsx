import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Volume2, VolumeX, RotateCcw } from "lucide-react";

const whatsappMessagesEnglish = [
  { role: "ai", text: "Good morning Lakshmi aunty! 🙏 Did you take your morning medicines?", delay: 0 },
  { role: "elder", text: "Yes beta, I took my BP medicine", delay: 2000 },
  { role: "ai", text: "That's wonderful! How are you feeling today?", delay: 3500 },
  { role: "elder", text: "Feeling good, had idli for breakfast", delay: 5500 },
  { role: "ai", text: "Sounds healthy! I'll let your family know you're doing well. Take care! 💚", delay: 7000 },
];

const whatsappMessagesHindi = [
  { role: "ai", text: "नमस्ते लक्ष्मी आंटी! 🙏 क्या आपने सुबह की दवाइयां ली हैं?", delay: 0 },
  { role: "elder", text: "हां बेटा, मैंने BP की दवाई ले ली", delay: 2000 },
  { role: "ai", text: "बहुत अच्छा! आज आपकी तबीयत कैसी है?", delay: 3500 },
  { role: "elder", text: "ठीक हूं, नाश्ते में इडली खाई", delay: 5500 },
  { role: "ai", text: "बहुत बढ़िया! मैं आपके परिवार को बता दूंगी कि आप ठीक हैं। ख्याल रखिए! 💚", delay: 7000 },
];

const voiceCallScriptEnglish = [
  { role: "ai", text: "Hello! This is Sentio calling for your daily check-in.", delay: 0 },
  { role: "elder", text: "Hello beta, yes I'm here.", delay: 2500 },
  { role: "ai", text: "How are you feeling this morning? Any discomfort?", delay: 4000 },
  { role: "elder", text: "I'm feeling fine, just a little tired.", delay: 6500 },
  { role: "ai", text: "I understand. Make sure to rest well. I'll inform your family.", delay: 8500 },
];

const voiceCallScriptHindi = [
  { role: "ai", text: "नमस्ते! यह Sentio है, आपकी दैनिक स्वास्थ्य जांच के लिए।", delay: 0 },
  { role: "elder", text: "नमस्ते बेटा, हां मैं यहां हूं।", delay: 2500 },
  { role: "ai", text: "आज सुबह आप कैसा महसूस कर रहे हैं? कोई तकलीफ तो नहीं?", delay: 4000 },
  { role: "elder", text: "ठीक हूं, बस थोड़ी थकान है।", delay: 6500 },
  { role: "ai", text: "समझ गई। आराम जरूर कीजिए। मैं आपके परिवार को बता देती हूं।", delay: 8500 },
];

const DemoSection = () => {
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [language, setLanguage] = useState<"english" | "hindi">("english");
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const whatsappMessages = language === "hindi" ? whatsappMessagesHindi : whatsappMessagesEnglish;
  const voiceCallScript = language === "hindi" ? voiceCallScriptHindi : voiceCallScriptEnglish;

  useEffect(() => {
    if (!isPlaying) return;

    const timers: NodeJS.Timeout[] = [];

    whatsappMessages.forEach((msg, index) => {
      const timer = setTimeout(() => {
        setWhatsappIndex(index + 1);
      }, msg.delay);
      timers.push(timer);
    });

    voiceCallScript.forEach((msg, index) => {
      const timer = setTimeout(() => {
        setVoiceIndex(index + 1);
        if (audioEnabled && msg.role === "ai") {
          speakText(msg.text);
        }
      }, msg.delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [isPlaying, audioEnabled, language]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.lang = language === "hindi" ? 'hi-IN' : 'en-IN';
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const resetDemo = () => {
    window.speechSynthesis?.cancel();
    setWhatsappIndex(0);
    setVoiceIndex(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  const toggleAudio = () => {
    if (audioEnabled) {
      window.speechSynthesis?.cancel();
    }
    setAudioEnabled(!audioEnabled);
  };

  const toggleLanguage = (newLang: "english" | "hindi") => {
    if (newLang !== language) {
      window.speechSynthesis?.cancel();
      setLanguage(newLang);
      setWhatsappIndex(0);
      setVoiceIndex(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    }
  };

  return (
    <section id="demo" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            See It In Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Watch how Sentio AI conducts caring check-ins with your loved ones
          </p>
          
          {/* Language Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
            <Button
              variant={language === "english" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("english")}
              className="rounded-full px-4"
            >
              English
            </Button>
            <Button
              variant={language === "hindi" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("hindi")}
              className="rounded-full px-4"
            >
              हिन्दी
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* WhatsApp Demo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp Check-in</h3>
                <p className="text-sm text-muted-foreground">Daily text conversation</p>
              </div>
            </div>
            
            <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {/* Phone header */}
              <div className="bg-accent px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
                  SA
                </div>
                <div className="text-white">
                  <p className="font-medium text-sm">Sentio AI</p>
                  <p className="text-xs text-white/70">online</p>
                </div>
              </div>
              
              {/* Chat area */}
              <div className="p-4 space-y-3 min-h-[300px] bg-muted/20">
                {whatsappMessages.slice(0, whatsappIndex).map((msg, index) => (
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
                {whatsappIndex < whatsappMessages.length && (
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
              </div>
            </Card>
          </div>

          {/* Voice Call Demo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Voice Call Check-in</h3>
                <p className="text-sm text-muted-foreground">Personalized phone call</p>
              </div>
            </div>
            
            <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {/* Phone header */}
              <div className="bg-foreground px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-sm font-medium">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="text-white">
                    <p className="font-medium text-sm">Sentio AI Call</p>
                    <p className="text-xs text-white/70">In progress...</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAudio}
                  className="text-white hover:bg-white/10"
                >
                  {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Call transcript */}
              <div className="p-4 space-y-4 min-h-[300px]">
                {/* Audio waveform visualization */}
                <div className="flex items-center justify-center gap-1 py-4">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-secondary/60 rounded-full animate-wave"
                      style={{
                        height: `${Math.random() * 24 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Transcript */}
                <div className="space-y-3">
                  {voiceCallScript.slice(0, voiceIndex).map((msg, index) => (
                    <div key={index} className="animate-fade-in">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">
                        {msg.role === "ai" ? "Sentio AI" : (language === "hindi" ? "बुज़ुर्ग" : "Elder")}
                      </p>
                      <p className={`text-sm ${msg.role === "ai" ? "text-foreground" : "text-muted-foreground italic"}`}>
                        "{msg.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={resetDemo}
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Replay Demo
          </Button>
          <Button
            variant={audioEnabled ? "default" : "outline"}
            onClick={toggleAudio}
            className="rounded-full"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
            {audioEnabled ? "Audio On" : "Enable Audio"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
