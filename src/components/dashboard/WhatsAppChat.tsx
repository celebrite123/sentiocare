import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, RefreshCw, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface WhatsAppChatProps {
  elderId: string;
  elderName: string;
  checkInMethod?: string;
}

const WhatsAppChat = ({ elderId, elderName, checkInMethod = 'voice' }: WhatsAppChatProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasWhatsAppNumber, setHasWhatsAppNumber] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isWhatsAppEnabled = checkInMethod === 'whatsapp' || checkInMethod === 'both';

  useEffect(() => {
    checkWhatsAppSetup();
    loadConversations();
  }, [elderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkWhatsAppSetup = async () => {
    try {
      const { data: elder } = await supabase
        .from('elders')
        .select('whatsapp_number')
        .eq('id', elderId)
        .single();

      setHasWhatsAppNumber(!!elder?.whatsapp_number);
    } catch (error) {
      console.error('Error checking WhatsApp setup:', error);
    }
  };

  const loadConversations = async () => {
    try {
      // Get recent conversations
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('id, status, started_at')
        .eq('elder_id', elderId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        // Get messages from the most recent conversation
        const { data: msgs } = await supabase
          .from('whatsapp_messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', conversations[0].id)
          .order('created_at', { ascending: true });

        setMessages(msgs || []);
      }
    } catch (error) {
      console.error('Error loading WhatsApp conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCheckIn = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-checkin', {
        body: { elderId }
      });

      if (error) throw error;

      toast({
        title: "Check-in sent",
        description: `WhatsApp message sent to ${elderName}`,
      });

      // Reload conversations after a delay
      setTimeout(loadConversations, 2000);
    } catch (error: any) {
      console.error('Error starting WhatsApp check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send WhatsApp check-in",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Don't show if WhatsApp is not enabled
  if (!isWhatsAppEnabled) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show setup prompt if WhatsApp is enabled but no number configured
  if (!hasWhatsAppNumber) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>WhatsApp number not configured for {elderName}.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/elders/${elderId}/settings`)}
                className="ml-4"
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-green-500" />
          WhatsApp Conversations
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadConversations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={startCheckIn} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Start Check-in
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No WhatsApp conversations yet</p>
            <p className="text-sm mt-1">Click "Start Check-in" to send a message</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === 'assistant' ? 'justify-start' : 'justify-end'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'assistant'
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      msg.role === 'assistant' ? 'text-muted-foreground' : 'opacity-70'
                    )}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppChat;
