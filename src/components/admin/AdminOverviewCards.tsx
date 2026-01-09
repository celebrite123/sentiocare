import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Phone, AlertTriangle, Heart, Pill, TrendingUp, Clock } from "lucide-react";

interface OverviewData {
  totalUsers: number;
  totalElders: number;
  activeTrials: number;
  premiumUsers: number;
  proUsers: number;
  basicUsers: number;
  totalCheckIns: number;
  totalMedicines: number;
}

interface CheckInStats {
  completedRate: number;
  avgWellbeing: number;
}

interface AlertStats {
  total: number;
  resolutionRate: number;
}

interface AdminOverviewCardsProps {
  overview: OverviewData;
  checkInStats: CheckInStats;
  alertStats: AlertStats;
}

const AdminOverviewCards = ({ overview, checkInStats, alertStats }: AdminOverviewCardsProps) => {
  const cards = [
    {
      title: "Total Users",
      value: overview.totalUsers,
      icon: Users,
      description: `${overview.activeTrials} on trial`,
      color: "text-blue-500",
    },
    {
      title: "Total Elders",
      value: overview.totalElders,
      icon: UserCheck,
      description: "Registered elders",
      color: "text-green-500",
    },
    {
      title: "Total Check-ins",
      value: overview.totalCheckIns,
      icon: Phone,
      description: `${checkInStats.completedRate}% success rate`,
      color: "text-purple-500",
    },
    {
      title: "Avg Wellbeing",
      value: checkInStats.avgWellbeing.toFixed(1),
      icon: Heart,
      description: "Out of 10",
      color: "text-red-500",
    },
    {
      title: "Total Alerts",
      value: alertStats.total,
      icon: AlertTriangle,
      description: `${alertStats.resolutionRate}% resolved`,
      color: "text-orange-500",
    },
    {
      title: "Active Medicines",
      value: overview.totalMedicines,
      icon: Pill,
      description: "Tracked medications",
      color: "text-teal-500",
    },
    {
      title: "Premium Users",
      value: overview.premiumUsers + overview.proUsers,
      icon: TrendingUp,
      description: `${overview.basicUsers} basic`,
      color: "text-amber-500",
    },
    {
      title: "Active Trials",
      value: overview.activeTrials,
      icon: Clock,
      description: "14-day trials",
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminOverviewCards;
