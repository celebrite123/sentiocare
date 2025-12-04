import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, RotateCcw, Volume2 } from "lucide-react";

const whatsappMessages = [
  { role: "ai", text: "Good morning Lakshmi aunty! 🙏 Did you take your morning medicines?", delay: 0 },
  { role: "elder", text: "Yes beta, I took my BP medicine after breakfast", delay: 2000 },
  { role: "ai", text: "That's wonderful! How are you feeling today? Any discomfort?", delay: 4000 },
  { role: "elder", text: "Feeling good today. Had some knee pain yesterday but better now", delay: 6500 },
  { role: "ai", text: "Glad you're feeling better! I'll note the knee pain and remind you to mention it to the doctor. Stay hydrated! 💚", delay: 9000 },
];

const voiceCallScript = [
  { role: "ai", text: "Namaste uncle! This is Sentio calling for your daily check-in.", delay: 0 },
  { role: "elder", text: "Namaste beta, how are you?", delay: 2500 },
  { role: "ai", text: "I'm well! Did you have your breakfast and medicines this morning?", delay: 4500 },
  { role: "elder", text: "Yes, I had upma and took my diabetes medicine.", delay: 7000 },
  { role: "ai", text: "Perfect! Your daughter will be happy to hear you're doing well. Take care, uncle!", delay: 9500 },
];

const DemoSection = () => {
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const timers: NodeJS.Timeout[] = [];

    whatsappMessages.forEach((msg, idx) => {
      timers.push(
        setTimeout(() => setWhatsappIndex(idx + 1), msg.delay + 500)
      );
    });

    voiceCallScript.forEach((msg, idx) => {
      timers.push(
        setTimeout(() => setVoiceIndex(idx + 1), msg.delay + 500)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [isPlaying]);

  const resetDemo = () => {
    setWhatsappIndex(0);
    setVoiceIndex(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  return (
    <section id="demo" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
            See How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Watch a real example of how Sentio AI checks in with your loved ones
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* WhatsApp Demo */}
          <Card className="overflow-hidden border-2 hover:border-accent/50 transition-all hover:shadow-xl">
            <div className="bg-accent p-4 flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-accent-foreground" />
              <span className="font-semibold text-accent-foreground">WhatsApp Check-in</span>
            </div>
            <div className="p-4 h-80 overflow-y-auto bg-gradient-to-b from-muted/50 to-background space-y-3">
              {whatsappMessages.slice(0, whatsappIndex).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === "ai"
                        ? "bg-card border rounded-bl-none"
                        : "bg-accent text-accent-foreground rounded-br-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              {whatsappIndex < whatsappMessages.length && isPlaying && (
                <div className="flex justify-start">
                  <div className="bg-card border p-3 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Voice Call Demo */}
          <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl">
            <div className="bg-primary p-4 flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary-foreground" />
              <span className="font-semibold text-primary-foreground">Voice Call</span>
              <Volume2 className="h-5 w-5 text-primary-foreground/70 ml-auto animate-pulse" />
            </div>
            <div className="p-4 h-80 overflow-y-auto space-y-4">
              {voiceCallScript.slice(0, voiceIndex).map((msg, idx) => (
                <div key={idx} className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${msg.role === "ai" ? "bg-primary" : "bg-secondary"}`} />
                    <span className="text-xs text-muted-foreground font-medium uppercase">
                      {msg.role === "ai" ? "Sentio AI" : "Elder"}
                    </span>
                  </div>
                  <p className="text-sm pl-4 border-l-2 border-border">{msg.text}</p>
                  {/* Audio waveform visualization */}
                  <div className="flex items-center gap-0.5 mt-2 pl-4">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary/40 rounded-full animate-audio-wave"
                        style={{
                          height: `${Math.random() * 16 + 4}px`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {voiceIndex < voiceCallScript.length && isPlaying && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs">Speaking...</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" onClick={resetDemo} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Replay Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
