import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type RiskStatus = 'pending' | 'stable' | 'nurse_followup' | 'urgent';

interface RiskBadgeProps {
  status: RiskStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

const riskConfig: Record<RiskStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'border-muted-foreground/50 text-muted-foreground',
    icon: <Clock className="h-3 w-3" />,
  },
  stable: {
    label: 'Stable',
    variant: 'secondary',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  nurse_followup: {
    label: 'Nurse Follow-up',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
    icon: <Phone className="h-3 w-3" />,
  },
  urgent: {
    label: 'Urgent',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export const RiskBadge = ({ status, size = 'default', showIcon = true }: RiskBadgeProps) => {
  const config = riskConfig[status] || riskConfig.pending;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        size === 'sm' && 'text-xs py-0 px-1.5',
        showIcon && 'gap-1'
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};
