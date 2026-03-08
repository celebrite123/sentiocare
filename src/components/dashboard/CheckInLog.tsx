import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
interface ConversationLog {
  id: string;
  role: string;
  message: string;
  timestamp: string;
}

interface CheckIn {
  id: string;
  check_in_type: string;
  created_at: string;
  conversation_summary: string | null;
  raw_transcript: string | null;
  sentiment: string | null;
  status: string;
  well_being_score: number | null;
  medicines_taken: boolean | null;
  recording_url: string | null;
}

interface CheckInLogProps {
  elderId: string;
}

// Audio player component that uses proxy to avoid CORS issues
const AudioPlayer = ({ checkInId }: { checkInId: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadAndPlay = async () => {
    if (loading) return;
    
    // If already loaded, just show the player
    if (audioUrl) {
      setReady(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Create Audio element immediately in gesture context (critical for iOS Safari)
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    
    // Unlock audio on mobile by playing silence in gesture context
    try { await audio.play(); } catch { /* expected - no src yet */ }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to play recordings");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-recording?checkInId=${checkInId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load recording');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setReady(true);
      
      // Set src and play on the already-unlocked audio element
      audio.src = url;
      audio.onended = () => { /* keep url alive for replay */ };
      await audio.play().catch(() => { /* user can press play on controls */ });
    } catch (err: any) {
      console.error('Error loading audio:', err);
      setError(err.message || 'Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  return (
    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
      <p className="text-sm font-medium mb-2">Voice Recording</p>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : ready && audioUrl ? (
        <audio 
          controls 
          className="w-full h-10"
          src={audioUrl}
        >
          Your browser does not support the audio element.
        </audio>
      ) : (
        <button
          onClick={loadAndPlay}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recording...
            </>
          ) : (
            "▶ Play recording"
          )}
        </button>
      )}
    </div>
  );
};

const CheckInLog = ({ elderId }: CheckInLogProps) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheckIn, setExpandedCheckIn] = useState<string | null>(null);
  const [conversationLogs, setConversationLogs] = useState<Record<string, ConversationLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

  useEffect(() => {
    if (elderId) {
      loadCheckIns();
    }
  }, [elderId]);

  const loadCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select("id, check_in_type, created_at, conversation_summary, raw_transcript, sentiment, status, well_being_score, medicines_taken, recording_url")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCheckIns((data as CheckIn[]) || []);
    } catch (error) {
      console.error("Error loading check-ins:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationLogs = async (checkInId: string) => {
    if (conversationLogs[checkInId]) return; // Already loaded
    
    setLoadingLogs(checkInId);
    try {
      const { data, error } = await supabase
        .from("conversation_logs")
        .select("id, role, message, timestamp")
        .eq("check_in_id", checkInId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      setConversationLogs(prev => ({
        ...prev,
        [checkInId]: data || []
      }));
    } catch (error) {
      console.error("Error loading conversation logs:", error);
    } finally {
      setLoadingLogs(null);
    }
  };

  const handleToggleExpand = async (checkInId: string) => {
    if (expandedCheckIn === checkInId) {
      setExpandedCheckIn(null);
    } else {
      setExpandedCheckIn(checkInId);
      await loadConversationLogs(checkInId);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "bg-accent/10 text-accent border-accent/20";
      case "negative":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getWellBeingColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 7) return "text-accent";
    if (score >= 5) return "text-warning";
    return "text-destructive";
  };

  // Format raw transcript for display when parsed logs are empty
  const formatRawTranscript = (rawTranscript: string | null) => {
    if (!rawTranscript) return null;
    
    // Split by common patterns and format for display
    const lines = rawTranscript.split(/\n+/).filter(l => l.trim());
    return lines.map((line, index) => ({
      id: `raw-${index}`,
      role: line.toLowerCase().startsWith('assistant') || 
            line.toLowerCase().startsWith('ai') || 
            line.toLowerCase().startsWith('agent') ||
            line.toLowerCase().startsWith('sentio')
        ? 'assistant' 
        : 'user',
      message: line.replace(/^(assistant|ai|agent|user|elder|sentio):\s*/i, '').trim(),
    })).filter(l => l.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in History</CardTitle>
        <CardDescription>Recent AI-powered health check conversations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : checkIns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No check-ins yet. Initiate a call to start.</p>
          ) : (
            <div className="space-y-4">
              {checkIns.map((checkIn) => {
                const logs = conversationLogs[checkIn.id] || [];
                const hasLogs = logs.length > 0;
                const rawFormatted = !hasLogs ? formatRawTranscript(checkIn.raw_transcript) : null;
                const displayLogs = hasLogs ? logs : (rawFormatted || []);
                
                return (
                  <Collapsible
                    key={checkIn.id}
                    open={expandedCheckIn === checkIn.id}
                    onOpenChange={() => handleToggleExpand(checkIn.id)}
                  >
                    <div className="rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <CollapsibleTrigger className="w-full text-left">
                        <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                checkIn.check_in_type === "voice"
                                  ? "bg-primary/10"
                                  : "bg-accent/10"
                              }`}
                            >
                              {checkIn.check_in_type === "voice" ? (
                                <Phone className="h-5 w-5 text-primary" />
                              ) : (
                                <MessageSquare className="h-5 w-5 text-accent" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">
                                  {format(new Date(checkIn.created_at), "MMM dd, yyyy h:mm a")}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={
                                    checkIn.check_in_type === "voice"
                                      ? "border-primary text-primary"
                                      : "border-accent text-accent"
                                  }
                                >
                                  {checkIn.check_in_type === "voice" ? "Voice Call" : "WhatsApp"}
                                </Badge>
                                {checkIn.well_being_score && (
                                  <Badge variant="outline" className={getWellBeingColor(checkIn.well_being_score)}>
                                    Score: {checkIn.well_being_score}/10
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {checkIn.sentiment && (
                                  <Badge
                                    variant="secondary"
                                    className={getSentimentColor(checkIn.sentiment)}
                                  >
                                    {checkIn.sentiment === "positive" ? "All Good" : checkIn.sentiment}
                                  </Badge>
                                )}
                                {expandedCheckIn === checkIn.id ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {checkIn.conversation_summary || "No summary available"}
                            </p>

                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {checkIn.medicines_taken !== null && (
                                <span className={checkIn.medicines_taken ? "text-accent" : "text-destructive"}>
                                  Medicine: {checkIn.medicines_taken ? "Taken ✓" : "Not taken ✗"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t pt-4 mt-2">
                          {/* Audio Recording - use proxy to avoid CORS */}
                          {checkIn.recording_url && (
                            <AudioPlayer checkInId={checkIn.id} />
                          )}

                          {/* Full Transcript */}
                          <div>
                            <p className="text-sm font-medium mb-3">
                              Full Conversation
                              {!hasLogs && rawFormatted && rawFormatted.length > 0 && (
                                <span className="text-muted-foreground font-normal ml-2">(from raw transcript)</span>
                              )}
                            </p>
                            {loadingLogs === checkIn.id ? (
                              <p className="text-sm text-muted-foreground">Loading transcript...</p>
                            ) : displayLogs.length > 0 ? (
                              <div className="space-y-3 max-h-80 overflow-y-auto">
                                {displayLogs.map((log: any) => (
                                  <div
                                    key={log.id}
                                    className={`p-3 rounded-lg text-sm ${
                                      log.role === "assistant"
                                        ? "bg-primary/10 border-l-2 border-primary ml-4"
                                        : "bg-muted mr-4"
                                    }`}
                                  >
                                    <p className="text-xs font-medium mb-1 text-muted-foreground">
                                      {log.role === "assistant" ? "Sentio AI" : "Elder"}
                                    </p>
                                    <p>{log.message}</p>
                                  </div>
                                ))}
                              </div>
                            ) : checkIn.raw_transcript ? (
                              // Fallback: show raw transcript as a single block
                              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                                {checkIn.raw_transcript}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No detailed transcript available for this check-in.</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CheckInLog;
