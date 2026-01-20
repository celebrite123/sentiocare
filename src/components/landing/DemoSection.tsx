import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, RotateCcw } from "lucide-react";
import AudioWaveVisualization from "./AudioWaveVisualization";

// Authentic Hindi conversations - natural, warm, family-like
const whatsappMessagesHindi = [
  { role: "ai", text: "नमस्ते दादी जी! 🙏 आज सुबह की दवाई ली आपने?", delay: 0 },
  { role: "elder", text: "हां बेटा, BP की गोली ले ली", delay: 2500 },
  { role: "ai", text: "बहुत अच्छा! तबीयत कैसी है आज?", delay: 4500 },
  { role: "elder", text: "ठीक हूं, आज पोहा खाया नाश्ते में", delay: 7000 },
  { role: "ai", text: "वाह! आप अपना ख्याल रखिए। परिवार को बता देती हूं कि सब ठीक है। 💚", delay: 9000 },
];

const whatsappMessagesEnglish = [
  { role: "ai", text: "Good morning! 🙏 Did you take your morning medicines?", delay: 0 },
  { role: "elder", text: "Yes dear, I took my BP tablet", delay: 2500 },
  { role: "ai", text: "That's wonderful! How are you feeling today?", delay: 4500 },
  { role: "elder", text: "Feeling good, had poha for breakfast", delay: 7000 },
  { role: "ai", text: "Lovely! Take care, I'll let your family know you're doing well. 💚", delay: 9000 },
];

// Voice call - realistic elder check-in conversation
const voiceCallScriptHindi = [
  { role: "ai", text: "नमस्ते दादी जी! कैसी तबीयत है आज?", delay: 0 },
  { role: "elder", text: "ठीक हूं बेटा, बस थोड़ी कमज़ोरी लग रही है।", delay: 2500 },
  { role: "ai", text: "अच्छा, 1 से 10 में कितनी कमज़ोरी है?", delay: 5000 },
  { role: "elder", text: "3-4 होगी, ज़्यादा नहीं।", delay: 7500 },
  { role: "ai", text: "ठीक है। आराम कीजिए, मैं परिवार को बता देती हूं। दवाई ज़रूर लीजिएगा।", delay: 9500 },
];

const voiceCallScriptEnglish = [
  { role: "ai", text: "Hello! How are you feeling today?", delay: 0 },
  { role: "elder", text: "I'm okay dear, just feeling a bit weak.", delay: 2500 },
  { role: "ai", text: "I see. From 1 to 10, how weak do you feel?", delay: 5000 },
  { role: "elder", text: "Maybe 3 or 4, not too bad.", delay: 7500 },
  { role: "ai", text: "Alright. Please rest well, I'll let your family know. Don't forget your medicines.", delay: 9500 },
];

const DemoSection = () => {
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [language, setLanguage] = useState<"english" | "hindi">("hindi");

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
      }, msg.delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isPlaying, language, whatsappMessages, voiceCallScript]);

  const resetDemo = () => {
    setWhatsappIndex(0);
    setVoiceIndex(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  const toggleLanguage = (newLang: "english" | "hindi") => {
    if (newLang !== language) {
      setLanguage(newLang);
      setWhatsappIndex(0);
      setVoiceIndex(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    }
  };

  return (
    <section id="demo" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-0 px-3 py-1">
            Hearing is Believing
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Experience a Live Demo
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Watch how Sentio AI conducts caring check-ins with your loved ones
          </p>
          
          {/* Language Toggle - enhanced */}
          <div className="inline-flex items-center gap-1 p-1.5 bg-card border border-border rounded-full shadow-sm">
            <Button
              variant={language === "hindi" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("hindi")}
              className="rounded-full px-6"
            >
              हिन्दी
            </Button>
            <Button
              variant={language === "english" ? "default" : "ghost"}
              size="sm"
              onClick={() => toggleLanguage("english")}
              className="rounded-full px-6"
            >
              English
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* WhatsApp Demo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-whatsapp/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-whatsapp" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">WhatsApp Check-in</h3>
                <p className="text-sm text-muted-foreground">Daily text conversation</p>
              </div>
            </div>
            
            <Card className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
              {/* Phone header */}
              <div className="bg-whatsapp px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div className="text-white">
                  <p className="font-semibold">Sentio</p>
                  <p className="text-xs text-white/70">online</p>
                </div>
              </div>
              
              {/* Chat area */}
              <div className="p-4 space-y-3 min-h-[320px] bg-muted/20">
                {whatsappMessages.slice(0, whatsappIndex).map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "elder" ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        msg.role === "elder"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {whatsappIndex < whatsappMessages.length && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5">
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
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Phone className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Voice Call Check-in</h3>
                <p className="text-sm text-muted-foreground">Personalized phone call</p>
              </div>
            </div>
            
            <Card className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
              {/* Phone header - dark like a call screen */}
              <div className="bg-gradient-to-r from-foreground to-foreground/90 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="font-semibold">Sentio Call</p>
                    <p className="text-xs text-white/70">{language === "hindi" ? "कॉल चालू है..." : "In progress..."}</p>
                  </div>
                </div>
              </div>
              
              {/* Call transcript */}
              <div className="p-4 min-h-[320px]">
                {/* Audio waveform visualization - enhanced */}
                <div className="flex flex-col items-center gap-3 py-6 mb-4 bg-muted/30 rounded-xl">
                  <AudioWaveVisualization isActive={voiceIndex < voiceCallScript.length} className="h-8" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {language === "hindi" ? "📞 वॉइस ट्रांसक्रिप्ट" : "📞 Live Transcript"}
                  </p>
                </div>
                
                {/* Transcript */}
                <div className="space-y-4">
                  {voiceCallScript.slice(0, voiceIndex).map((msg, index) => (
                    <div key={index} className="animate-fade-in">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
                        {msg.role === "ai" ? "Sentio" : (language === "hindi" ? "दादी जी" : "Elder")}
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
        <div className="flex justify-center gap-4 mt-10">
          <Button
            variant="outline"
            onClick={resetDemo}
            className="rounded-full px-6 border-2"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {language === "hindi" ? "फिर से देखें" : "Replay Demo"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
