import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Phone, CheckCircle, Clock, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Callback {
  id: string;
  patient_id: string;
  scheduled_for: string;
  reason: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  patient?: {
    patient_name: string;
    mobile_number: string;
  };
}

interface PendingCallbacksProps {
  organizationId: string;
  patientId?: string;
  compact?: boolean;
  onUpdate?: () => void;
}

export function PendingCallbacks({ 
  organizationId, 
  patientId, 
  compact = false,
  onUpdate 
}: PendingCallbacksProps) {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  const fetchCallbacks = async () => {
    try {
      let query = supabase
        .from("scheduled_callbacks")
        .select(`
          *,
          discharged_patients (
            patient_name,
            mobile_number
          )
        `)
        .eq("organization_id", organizationId)
        .in("status", ["pending"])
        .order("scheduled_for", { ascending: true });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query.limit(compact ? 5 : 20);

      if (error) throw error;

      const formattedCallbacks = (data || []).map((cb: any) => ({
        ...cb,
        patient: cb.discharged_patients,
      }));

      setCallbacks(formattedCallbacks);
    } catch (error: any) {
      console.error("Error fetching callbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbacks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`callbacks-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_callbacks",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => fetchCallbacks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, patientId]);

  const handleComplete = (callback: Callback) => {
    setSelectedCallback(callback);
    setCompletionNotes("");
    setCompleteDialogOpen(true);
  };

  const confirmComplete = async () => {
    if (!selectedCallback) return;

    setCompleting(selectedCallback.id);
    try {
      const { error } = await supabase
        .from("scheduled_callbacks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: completionNotes || "Callback completed",
        })
        .eq("id", selectedCallback.id);

      if (error) throw error;

      toast({ title: "Callback marked as complete" });
      setCompleteDialogOpen(false);
      fetchCallbacks();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error completing callback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
    }
  };

  const handleCancel = async (callbackId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_callbacks")
        .update({ status: "cancelled" })
        .eq("id", callbackId);

      if (error) throw error;

      toast({ title: "Callback cancelled" });
      fetchCallbacks();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error cancelling callback",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isPast = (dateStr: string) => new Date(dateStr) < new Date();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (callbacks.length === 0) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Scheduled Callbacks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            No pending callbacks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            {compact ? "Pending Callbacks" : "Scheduled Callbacks"}
            <Badge variant="secondary" className="ml-auto text-xs">
              {callbacks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          {callbacks.map((callback) => (
            <div
              key={callback.id}
              className={`p-2 sm:p-3 rounded-lg border ${
                isPast(callback.scheduled_for)
                  ? "border-destructive bg-destructive/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {!patientId && callback.patient && (
                    <p className="font-medium text-sm sm:text-base truncate">
                      {callback.patient.patient_name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      {format(new Date(callback.scheduled_for), "MMM d, h:mm a")}
                    </span>
                    {isPast(callback.scheduled_for) && (
                      <Badge variant="destructive" className="text-[10px] sm:text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  {callback.reason && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                      {callback.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-0.5 sm:gap-1 shrink-0">
                  {callback.patient && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => window.open(`tel:${callback.patient?.mobile_number}`, "_self")}
                    >
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-green-600"
                    onClick={() => handleComplete(callback)}
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground"
                    onClick={() => handleCancel(callback.id)}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Callback</DialogTitle>
            <DialogDescription>
              Add notes from your call with {selectedCallback?.patient?.patient_name || "the patient"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Summary of the call, patient status, any follow-up needed..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={completing !== null}>
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
