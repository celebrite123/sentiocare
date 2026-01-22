import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Phone,
  TrendingUp,
  Pill,
  Clock,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const StatCard = ({ title, value, description, icon, trend, variant = 'default' }: StatCardProps) => {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <Card className={cn("transition-all hover:shadow-md", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("h-5 w-5", iconStyles[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <span className={cn(
              "text-xs flex items-center",
              trend.positive ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className={cn(
                "h-3 w-3 mr-0.5",
                !trend.positive && "rotate-180"
              )} />
              {trend.value}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  stats: {
    totalPatients: number;
    urgentCases: number;
    nurseFollowups: number;
    stableCases: number;
    pendingChecks: number;
    medicineAdherence: number;
    callsToday: number;
    messagessSent: number;
  };
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Patients"
        value={stats.totalPatients}
        description="Active discharges"
        icon={<Users className="h-full w-full" />}
      />
      <StatCard
        title="Urgent Cases"
        value={stats.urgentCases}
        description="Need immediate attention"
        icon={<AlertTriangle className="h-full w-full" />}
        variant="danger"
      />
      <StatCard
        title="Nurse Follow-ups"
        value={stats.nurseFollowups}
        description="Awaiting callback"
        icon={<Phone className="h-full w-full" />}
        variant="warning"
      />
      <StatCard
        title="Stable Patients"
        value={stats.stableCases}
        description="No action needed"
        icon={<CheckCircle2 className="h-full w-full" />}
        variant="success"
      />
      <StatCard
        title="Pending 48hr Checks"
        value={stats.pendingChecks}
        description="Scheduled for today"
        icon={<Clock className="h-full w-full" />}
      />
      <StatCard
        title="Medicine Adherence"
        value={`${stats.medicineAdherence}%`}
        description="Average compliance"
        icon={<Pill className="h-full w-full" />}
        variant={stats.medicineAdherence >= 80 ? 'success' : stats.medicineAdherence >= 60 ? 'warning' : 'danger'}
      />
      <StatCard
        title="Calls Today"
        value={stats.callsToday}
        description="Voice check-ins"
        icon={<Phone className="h-full w-full" />}
      />
      <StatCard
        title="Messages Sent"
        value={stats.messagessSent}
        description="WhatsApp / SMS"
        icon={<MessageSquare className="h-full w-full" />}
      />
    </div>
  );
};
