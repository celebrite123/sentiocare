import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Phone,
  Pill,
  HelpCircle,
  CheckCircle2,
  User,
  Clock,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInMinutes, differenceInHours } from "date-fns";

type AlertType = 'urgent' | 'nurse_followup' | 'missed_medicine' | 'help_request';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface Alert {
  id: string;
  alert_type: AlertType;
  severity: Severity;
  title: string;
  description: string | null;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string;
  assigned_to: string | null;
  assigned_name?: string;
  resolved: boolean;
  created_at: string;
  sla_deadline?: string | null;
  sla_breached?: boolean;
}

interface AlertCardProps {
  alert: Alert;
  onAssign?: (alertId: string) => void;
  onResolve?: (alertId: string, notes: string) => void;
  onCall?: (phone: string) => void;
  // Feature 4: Selection props
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (alertId: string, selected: boolean) => void;
}

const alertTypeConfig: Record<AlertType, { icon: React.ReactNode; color: string }> = {
  urgent: { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600' },
  nurse_followup: { icon: <Phone className="h-5 w-5" />, color: 'text-yellow-600' },
  missed_medicine: { icon: <Pill className="h-5 w-5" />, color: 'text-orange-600' },
  help_request: { icon: <HelpCircle className="h-5 w-5" />, color: 'text-blue-600' },
};

const severityStyles: Record<Severity, string> = {
  low: 'border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
  medium: 'border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20',
  high: 'border-l-orange-400 bg-orange-50/50 dark:bg-orange-950/20',
  critical: 'border-l-red-400 bg-red-50/50 dark:bg-red-950/20',
};

// SLA countdown helper
const getSlaStatus = (slaDeadline: string | null | undefined, breached: boolean | undefined) => {
  if (!slaDeadline) return null;
  
  if (breached) {
    return { status: 'breached', label: 'SLA Breached', color: 'text-destructive' };
  }

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const minutesLeft = differenceInMinutes(deadline, now);
  const hoursLeft = differenceInHours(deadline, now);

  if (minutesLeft <= 0) {
    return { status: 'breached', label: 'SLA Breached', color: 'text-destructive' };
  }
  
  if (minutesLeft <= 15) {
    return { status: 'critical', label: `${minutesLeft}m left`, color: 'text-destructive animate-pulse' };
  }
  
  if (minutesLeft <= 60) {
    return { status: 'warning', label: `${minutesLeft}m left`, color: 'text-orange-600' };
  }

  return { status: 'ok', label: `${hoursLeft}h left`, color: 'text-muted-foreground' };
};

export const AlertCard = ({ 
  alert, 
  onAssign, 
  onResolve, 
  onCall,
  selectable = false,
  selected = false,
  onSelect,
}: AlertCardProps) => {
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const config = alertTypeConfig[alert.alert_type] || alertTypeConfig.urgent;
  const slaStatus = !alert.resolved ? getSlaStatus(alert.sla_deadline, alert.sla_breached) : null;

  const handleResolve = () => {
    if (onResolve) {
      onResolve(alert.id, notes);
      setNotes("");
      setShowNotes(false);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(alert.id, checked);
  };

  return (
    <Card className={cn(
      "border-l-4 transition-all hover:shadow-md",
      severityStyles[alert.severity],
      selected && "ring-2 ring-primary"
    )}>
      <CardHeader className="pb-2 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {/* Feature 4: Checkbox for selection */}
            {selectable && !alert.resolved && (
              <Checkbox
                checked={selected}
                onCheckedChange={handleCheckboxChange}
                className="mt-1 shrink-0"
              />
            )}
            <div className={cn("shrink-0 mt-0.5", config.color)}>{config.icon}</div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                {alert.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{alert.patient_name || 'Unknown Patient'}</span>
                {alert.patient_phone && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-xs">{alert.patient_phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
              {alert.severity}
            </Badge>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </span>
              {/* SLA Countdown */}
              {slaStatus && (
                <span className={cn("text-[10px] sm:text-xs font-medium flex items-center gap-1", slaStatus.color)}>
                  {slaStatus.status === 'breached' ? '⚠️' : '⏱️'} {slaStatus.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {alert.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-3">{alert.description}</p>
        )}

        {alert.assigned_to && (
          <div className="text-xs sm:text-sm text-muted-foreground mb-3 flex items-center gap-1">
            <User className="h-3 w-3" />
            Assigned to: <span className="font-medium">{alert.assigned_name || 'Staff Member'}</span>
          </div>
        )}

        {showNotes && (
          <div className="mb-3">
            <Textarea
              placeholder="Add resolution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-2 text-sm"
              rows={3}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {alert.patient_phone && onCall && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onCall(alert.patient_phone!)}
            >
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Call
            </Button>
          )}
          
          {!alert.assigned_to && onAssign && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onAssign(alert.id)}
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Assign
            </Button>
          )}
          
          {!alert.resolved && onResolve && (
            <>
              {!showNotes ? (
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setShowNotes(true)}
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Resolve
                </Button>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setShowNotes(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="default" className="text-xs h-8" onClick={handleResolve}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
