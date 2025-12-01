import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Activity, Pill, TrendingUp, Plus, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, subDays } from "date-fns";

interface Elder {
  id: string;
  full_name: string;
  age: number | null;
  medical_conditions: string[] | null;
}

interface HealthMetric {
  id: string;
  metric_type: string;
  value: string;
  status: string | null;
  recorded_at: string;
}

interface CheckIn {
  id: string;
  well_being_score: number | null;
  medicines_taken: boolean | null;
  sentiment: string | null;
  created_at: string;
}

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  active: boolean | null;
}

const HealthBook = () => {
  const { elderId } = useParams<{ elderId: string }>();
  const navigate = useNavigate();
  const [elder, setElder] = useState<Elder | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMetricOpen, setAddMetricOpen] = useState(false);
  const [newMetric, setNewMetric] = useState({
    metric_type: "blood_pressure",
    value: "",
  });

  useEffect(() => {
    if (elderId) {
      fetchHealthData();
    }
  }, [elderId]);

  const fetchHealthData = async () => {
    try {
      const [elderRes, metricsRes, checkInsRes, medicinesRes] = await Promise.all([
        supabase.from("elders").select("*").eq("id", elderId).single(),
        supabase
          .from("health_metrics")
          .select("*")
          .eq("elder_id", elderId)
          .order("recorded_at", { ascending: false })
          .limit(50),
        supabase
          .from("check_ins")
          .select("*")
          .eq("elder_id", elderId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("medicines").select("*").eq("elder_id", elderId).eq("active", true),
      ]);

      if (elderRes.data) setElder(elderRes.data);
      if (metricsRes.data) setHealthMetrics(metricsRes.data);
      if (checkInsRes.data) setCheckIns(checkInsRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addHealthMetric = async () => {
    if (!newMetric.value.trim()) {
      toast({ title: "Error", description: "Please enter a value", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("health_metrics").insert({
        elder_id: elderId,
        metric_type: newMetric.metric_type,
        value: newMetric.value,
        status: "normal",
      });

      if (error) throw error;

      toast({ title: "Success", description: "Health metric recorded" });
      setAddMetricOpen(false);
      setNewMetric({ metric_type: "blood_pressure", value: "" });
      fetchHealthData();
    } catch (error) {
      console.error("Error adding metric:", error);
      toast({ title: "Error", description: "Failed to add metric", variant: "destructive" });
    }
  };

  // Calculate stats
  const medicineAdherence =
    checkIns.length > 0
      ? Math.round((checkIns.filter((c) => c.medicines_taken).length / checkIns.length) * 100)
      : 0;

  const avgWellbeing =
    checkIns.filter((c) => c.well_being_score).length > 0
      ? Math.round(
          checkIns.filter((c) => c.well_being_score).reduce((sum, c) => sum + (c.well_being_score || 0), 0) /
            checkIns.filter((c) => c.well_being_score).length
        )
      : 0;

  const latestMetricByType = (type: string) =>
    healthMetrics.find((m) => m.metric_type === type);

  // Prepare chart data
  const wellbeingChartData = checkIns
    .filter((c) => c.well_being_score)
    .reverse()
    .slice(-14)
    .map((c) => ({
      date: format(new Date(c.created_at), "MMM d"),
      score: c.well_being_score,
    }));

  const getMetricChartData = (type: string) =>
    healthMetrics
      .filter((m) => m.metric_type === type)
      .reverse()
      .slice(-14)
      .map((m) => ({
        date: format(new Date(m.recorded_at), "MMM d"),
        value: parseFloat(m.value) || 0,
      }));

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading health data...</div>
        </div>
      </>
    );
  }

  if (!elder) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">Elder not found</p>
          <Button onClick={() => navigate("/elders")}>Back to Elders</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate(`/dashboard?elderId=${elderId}`)} className="gap-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{elder.full_name}'s Health Book</h1>
                <p className="text-muted-foreground">
                  Complete health history and vitals tracking
                </p>
              </div>
              <Dialog open={addMetricOpen} onOpenChange={setAddMetricOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Reading
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Health Reading</DialogTitle>
                    <DialogDescription>Record a new health measurement</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Metric Type</Label>
                      <select
                        value={newMetric.metric_type}
                        onChange={(e) => setNewMetric({ ...newMetric, metric_type: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="blood_pressure">Blood Pressure</option>
                        <option value="heart_rate">Heart Rate (BPM)</option>
                        <option value="blood_sugar">Blood Sugar (mg/dL)</option>
                        <option value="weight">Weight (kg)</option>
                        <option value="temperature">Temperature (°C)</option>
                        <option value="oxygen_level">Oxygen Level (%)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={newMetric.value}
                        onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                        placeholder={
                          newMetric.metric_type === "blood_pressure"
                            ? "e.g., 120/80"
                            : "Enter value"
                        }
                      />
                    </div>
                    <Button onClick={addHealthMetric} className="w-full">
                      Save Reading
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Well-being Score</p>
                    <p className="text-3xl font-bold">{avgWellbeing}/10</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <Progress value={avgWellbeing * 10} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Medicine Adherence</p>
                    <p className="text-3xl font-bold">{medicineAdherence}%</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-full">
                    <Pill className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <Progress value={medicineAdherence} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Check-ins</p>
                    <p className="text-3xl font-bold">{checkIns.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/10 rounded-full">
                    <Calendar className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-info">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Medicines</p>
                    <p className="text-3xl font-bold">{medicines.length}</p>
                  </div>
                  <div className="p-3 bg-info/10 rounded-full">
                    <Activity className="h-6 w-6 text-info" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Currently prescribed</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="medicines">Medicines</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Well-being Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Well-being Trend
                    </CardTitle>
                    <CardDescription>Score from AI check-in calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wellbeingChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={wellbeingChartData}>
                          <defs>
                            <linearGradient id="wellbeingGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(186 85% 40%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(186 85% 40%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="hsl(186 85% 40%)"
                            fill="url(#wellbeingGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No check-in data yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Medical Conditions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-destructive" />
                      Medical Conditions
                    </CardTitle>
                    <CardDescription>Known health conditions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {elder.medical_conditions && elder.medical_conditions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {elder.medical_conditions.map((condition) => (
                          <Badge key={condition} variant="secondary" className="text-base px-4 py-2">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No conditions recorded</p>
                    )}
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">Age</p>
                      <p className="text-2xl font-bold">{elder.age || "—"} years</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Latest Vitals */}
              <Card>
                <CardHeader>
                  <CardTitle>Latest Vitals</CardTitle>
                  <CardDescription>Most recent health measurements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { type: "blood_pressure", label: "Blood Pressure", unit: "" },
                      { type: "heart_rate", label: "Heart Rate", unit: "BPM" },
                      { type: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
                      { type: "weight", label: "Weight", unit: "kg" },
                      { type: "temperature", label: "Temperature", unit: "°C" },
                      { type: "oxygen_level", label: "Oxygen", unit: "%" },
                    ].map((vital) => {
                      const metric = latestMetricByType(vital.type);
                      return (
                        <div key={vital.type} className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-1">{vital.label}</p>
                          <p className="text-xl font-bold">
                            {metric ? `${metric.value}${vital.unit ? ` ${vital.unit}` : ""}` : "—"}
                          </p>
                          {metric && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(metric.recorded_at), "MMM d")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vitals" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Heart Rate Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Heart Rate Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getMetricChartData("heart_rate").length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getMetricChartData("heart_rate")}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(0 84% 60%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(0 84% 60%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No heart rate data recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Blood Sugar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Blood Sugar Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getMetricChartData("blood_sugar").length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getMetricChartData("blood_sugar")}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(38 92% 50%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(38 92% 50%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No blood sugar data recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weight Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weight Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getMetricChartData("weight").length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getMetricChartData("weight")}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(142 76% 45%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(142 76% 45%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No weight data recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Oxygen Level Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Oxygen Level Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getMetricChartData("oxygen_level").length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getMetricChartData("oxygen_level")}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(210 85% 55%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(210 85% 55%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No oxygen data recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* All Vitals History */}
              <Card>
                <CardHeader>
                  <CardTitle>All Readings</CardTitle>
                  <CardDescription>Complete vitals history</CardDescription>
                </CardHeader>
                <CardContent>
                  {healthMetrics.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {healthMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium capitalize">
                                {metric.metric_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(metric.recorded_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{metric.value}</p>
                            {metric.status && (
                              <Badge
                                variant={
                                  metric.status === "normal"
                                    ? "default"
                                    : metric.status === "warning"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {metric.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No vitals recorded yet</p>
                      <Button
                        onClick={() => setAddMetricOpen(true)}
                        variant="outline"
                        className="mt-4"
                      >
                        Add First Reading
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medicines" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Current Medications</CardTitle>
                    <CardDescription>Active prescriptions and schedules</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/elders/${elderId}/medicines`)}
                  >
                    Manage Medicines
                  </Button>
                </CardHeader>
                <CardContent>
                  {medicines.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicines.map((med) => (
                        <div
                          key={med.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-accent/10 rounded-lg">
                                <Pill className="h-5 w-5 text-accent" />
                              </div>
                              <div>
                                <p className="font-semibold">{med.name}</p>
                                <p className="text-sm text-muted-foreground">{med.dosage}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{med.timing}</Badge>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {med.frequency.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No medications added yet</p>
                      <Button
                        onClick={() => navigate(`/elders/${elderId}/medicines`)}
                        variant="outline"
                        className="mt-4"
                      >
                        Add Medications
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medicine Adherence */}
              <Card>
                <CardHeader>
                  <CardTitle>Adherence Overview</CardTitle>
                  <CardDescription>Medicine-taking compliance from check-ins</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="hsl(210 15% 90%)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="hsl(142 76% 45%)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${medicineAdherence * 3.52} 352`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{medicineAdherence}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Based on {checkIns.length} check-in calls
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent"></div>
                        <span className="text-sm">
                          Medicines taken: {checkIns.filter((c) => c.medicines_taken).length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted"></div>
                        <span className="text-sm">
                          Missed: {checkIns.filter((c) => c.medicines_taken === false).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Check-in History</CardTitle>
                  <CardDescription>All AI call summaries and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {checkIns.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {checkIns.map((checkIn) => (
                        <div key={checkIn.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {format(new Date(checkIn.created_at), "MMMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {checkIn.sentiment && (
                                <Badge
                                  variant={
                                    checkIn.sentiment === "positive"
                                      ? "default"
                                      : checkIn.sentiment === "neutral"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {checkIn.sentiment}
                                </Badge>
                              )}
                              {checkIn.well_being_score && (
                                <Badge variant="outline">Score: {checkIn.well_being_score}/10</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span
                              className={`flex items-center gap-1 ${
                                checkIn.medicines_taken ? "text-accent" : "text-destructive"
                              }`}
                            >
                              <Pill className="h-4 w-4" />
                              {checkIn.medicines_taken ? "Medicines taken" : "Medicines missed"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No check-ins recorded yet</p>
                      <p className="text-sm mt-2">
                        Check-ins will appear here after AI calls are made
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default HealthBook;
