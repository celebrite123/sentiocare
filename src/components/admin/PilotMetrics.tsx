import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Phone, Pill, AlertTriangle, Users, TrendingUp, ArrowUpDown, Heart, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PilotMetricsData {
  weeklyPickupRates: Array<{ week: string; totalAttempts: number; answered: number; pickupRate: number }>;
  medicationVerification: {
    total: number; verified: number; tookMeds: number; missedMeds: number; unknown: number;
    verificationRate: number; adherenceRate: number;
  };
  escalationAccuracy: {
    total: number; resolved: number; pending: number; highSeverity: number;
    highSeverityResolved: number; mediumSeverity: number; lowSeverity: number; resolutionRate: number;
  };
  familyEngagement: {
    totalFamilies: number; alertsEnabled: number; weeklySummaryEnabled: number;
    missedCheckinEnabled: number; smsEnabled: number; emailEnabled: number; engagementRate: number;
  };
  elderBreakdown: Array<{
    name: string; callsAttempted: number; callsAnswered: number; pickupRate: number;
    avgWellbeing: number; totalCheckIns: number; medsTakenRate: number; alertsTriggered: number; alertsResolved: number;
  }>;
  weeklyWellbeing: Array<{ week: string; avgScore: number; count: number }>;
}

type SortKey = 'name' | 'pickupRate' | 'avgWellbeing' | 'medsTakenRate' | 'alertsTriggered';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'];

const PilotMetrics = ({ data }: { data: PilotMetricsData }) => {
  const [sortKey, setSortKey] = useState<SortKey>('pickupRate');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedElders = [...data.elderBreakdown].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const escalationPieData = [
    { name: 'Resolved', value: data.escalationAccuracy.resolved },
    { name: 'Pending', value: data.escalationAccuracy.pending },
  ];

  const formatWeek = (w: string) => {
    const d = new Date(w);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort(field)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Phone className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">{data.weeklyPickupRates.reduce((s, w) => s + w.totalAttempts, 0)}</div>
            <p className="text-sm text-muted-foreground">Total Calls Attempted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">
              {data.weeklyPickupRates.length > 0
                ? Math.round(data.weeklyPickupRates.reduce((s, w) => s + w.pickupRate, 0) / data.weeklyPickupRates.length * 10) / 10
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Avg Pickup Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Pill className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">{data.medicationVerification.adherenceRate}%</div>
            <p className="text-sm text-muted-foreground">Med Adherence</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">{data.escalationAccuracy.resolutionRate}%</div>
            <p className="text-sm text-muted-foreground">Alert Resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Pickup Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Weekly Pickup Rate Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.weeklyPickupRates.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyPickupRates}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" tickFormatter={formatWeek} className="text-xs" />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Pickup Rate']}
                  labelFormatter={formatWeek}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Line type="monotone" dataKey="pickupRate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No call attempt data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Medication + Escalation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Medication Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" /> Medication Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Verification Rate</span>
                <span className="font-semibold">{data.medicationVerification.verificationRate}%</span>
              </div>
              <Progress value={data.medicationVerification.verificationRate} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {data.medicationVerification.verified}/{data.medicationVerification.total} check-ins captured med status
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Adherence Rate</span>
                <span className="font-semibold">{data.medicationVerification.adherenceRate}%</span>
              </div>
              <Progress value={data.medicationVerification.adherenceRate} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {data.medicationVerification.tookMeds} took meds · {data.medicationVerification.missedMeds} missed · {data.medicationVerification.unknown} unknown
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Escalation Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Escalation Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={escalationPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                      {escalationPieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-2xl">{data.escalationAccuracy.total}</span>
                  <span className="text-muted-foreground">Total Alerts</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="destructive">{data.escalationAccuracy.highSeverity} High</Badge>
                  <Badge variant="secondary">{data.escalationAccuracy.mediumSeverity} Medium</Badge>
                  <Badge variant="outline">{data.escalationAccuracy.lowSeverity} Low</Badge>
                </div>
                <p className="text-muted-foreground">
                  {data.escalationAccuracy.highSeverityResolved}/{data.escalationAccuracy.highSeverity} high-severity resolved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wellbeing Trend + Family Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Wellbeing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" /> Weekly Wellbeing Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyWellbeing.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.weeklyWellbeing}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tickFormatter={formatWeek} className="text-xs" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip
                    formatter={(v: number) => [v, 'Avg Score']}
                    labelFormatter={formatWeek}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No wellbeing data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Family Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Family Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold">{data.familyEngagement.totalFamilies}</div>
              <p className="text-sm text-muted-foreground">Families with Notifications Configured</p>
            </div>
            {[
              { label: 'Alert Notifications', value: data.familyEngagement.alertsEnabled },
              { label: 'Weekly Summary', value: data.familyEngagement.weeklySummaryEnabled },
              { label: 'Missed Check-in Alerts', value: data.familyEngagement.missedCheckinEnabled },
              { label: 'SMS Notifications', value: data.familyEngagement.smsEnabled },
              { label: 'Email Notifications', value: data.familyEngagement.emailEnabled },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <Badge variant={item.value === data.familyEngagement.totalFamilies ? 'default' : 'secondary'}>
                  {item.value}/{data.familyEngagement.totalFamilies}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Elder Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Elder-Level Pilot Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortButton label="Elder" field="name" /></TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right"><SortButton label="Pickup %" field="pickupRate" /></TableHead>
                  <TableHead className="text-right"><SortButton label="Wellbeing" field="avgWellbeing" /></TableHead>
                  <TableHead className="text-right"><SortButton label="Med Adherence" field="medsTakenRate" /></TableHead>
                  <TableHead className="text-right"><SortButton label="Alerts" field="alertsTriggered" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedElders.map((elder, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{elder.name}</TableCell>
                    <TableCell className="text-right">{elder.callsAnswered}/{elder.callsAttempted}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={elder.pickupRate >= 60 ? 'default' : elder.pickupRate >= 30 ? 'secondary' : 'destructive'}>
                        {elder.pickupRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{elder.avgWellbeing}/10</TableCell>
                    <TableCell className="text-right">{elder.medsTakenRate}%</TableCell>
                    <TableCell className="text-right">
                      {elder.alertsTriggered > 0 ? (
                        <span>{elder.alertsResolved}/{elder.alertsTriggered} resolved</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PilotMetrics;
