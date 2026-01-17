import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, X, Heart, Utensils, Moon, Droplets, Footprints, Brain, Thermometer, Scale, Pill } from "lucide-react";

// Predefined monitoring topics with icons
const PREDEFINED_TOPICS = [
  { id: "blood_pressure", label: "Blood Pressure", labelHi: "ब्लड प्रेशर", icon: Heart, category: "health" },
  { id: "blood_sugar", label: "Blood Sugar", labelHi: "शुगर लेवल", icon: Droplets, category: "health" },
  { id: "temperature", label: "Temperature", labelHi: "बुखार/तापमान", icon: Thermometer, category: "health" },
  { id: "weight", label: "Weight", labelHi: "वजन", icon: Scale, category: "health" },
  { id: "pain_level", label: "Pain Level", labelHi: "दर्द का स्तर", icon: Activity, category: "health" },
  { id: "meals", label: "Meals (3x daily)", labelHi: "खाना (दिन में 3 बार)", icon: Utensils, category: "lifestyle" },
  { id: "water_intake", label: "Water Intake", labelHi: "पानी पीना", icon: Droplets, category: "lifestyle" },
  { id: "sleep_quality", label: "Sleep Quality", labelHi: "नींद की गुणवत्ता", icon: Moon, category: "lifestyle" },
  { id: "exercise", label: "Exercise/Walking", labelHi: "व्यायाम/चलना", icon: Footprints, category: "lifestyle" },
  { id: "mood", label: "Mood/Feeling", labelHi: "मूड/भावना", icon: Brain, category: "mental" },
  { id: "medicines_extra", label: "Extra Medicines", labelHi: "अतिरिक्त दवाइयां", icon: Pill, category: "health" },
];

interface CustomQuestion {
  id: string;
  question: string;
  questionHi?: string;
  type: "yes_no" | "scale" | "open";
}

interface MonitoringConfig {
  topics: string[];
  custom_questions: CustomQuestion[];
}

interface HealthMonitoringCardProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
  preferredLanguage: string;
}

const HealthMonitoringCard = ({ config, onChange, preferredLanguage }: HealthMonitoringCardProps) => {
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"yes_no" | "scale" | "open">("yes_no");
  
  const isHindi = preferredLanguage === "hindi";
  
  const toggleTopic = (topicId: string) => {
    const newTopics = config.topics.includes(topicId)
      ? config.topics.filter(t => t !== topicId)
      : [...config.topics, topicId];
    onChange({ ...config, topics: newTopics });
  };

  const addCustomQuestion = () => {
    if (!newQuestion.trim() || config.custom_questions.length >= 3) return;
    
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      question: newQuestion.trim(),
      type: newQuestionType,
    };
    
    onChange({
      ...config,
      custom_questions: [...config.custom_questions, newQ],
    });
    setNewQuestion("");
    setNewQuestionType("yes_no");
  };

  const removeCustomQuestion = (questionId: string) => {
    onChange({
      ...config,
      custom_questions: config.custom_questions.filter(q => q.id !== questionId),
    });
  };

  const healthTopics = PREDEFINED_TOPICS.filter(t => t.category === "health");
  const lifestyleTopics = PREDEFINED_TOPICS.filter(t => t.category === "lifestyle");
  const mentalTopics = PREDEFINED_TOPICS.filter(t => t.category === "mental");

  const renderTopicChips = (topics: typeof PREDEFINED_TOPICS) => (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic) => {
        const isSelected = config.topics.includes(topic.id);
        const IconComponent = topic.icon;
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => toggleTopic(topic.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50"
            }`}
          >
            <IconComponent className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isHindi ? topic.labelHi : topic.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Health Monitoring</CardTitle>
        </div>
        <CardDescription>
          Choose what the AI should ask about during check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Health Conditions */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Health Conditions</Label>
          <p className="text-sm text-muted-foreground">
            Track specific health metrics during check-ins
          </p>
          {renderTopicChips(healthTopics)}
        </div>

        {/* Lifestyle Topics */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Daily Activities</Label>
          <p className="text-sm text-muted-foreground">
            Monitor daily habits and routines
          </p>
          {renderTopicChips(lifestyleTopics)}
        </div>

        {/* Mental Well-being */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Mental Well-being</Label>
          <p className="text-sm text-muted-foreground">
            Check on emotional state and social connections
          </p>
          {renderTopicChips(mentalTopics)}
        </div>

        {/* Custom Questions */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-medium">Custom Questions</Label>
            <p className="text-sm text-muted-foreground">
              Add up to 3 personalized questions for the AI to ask
            </p>
          </div>

          {/* Existing custom questions */}
          {config.custom_questions.length > 0 && (
            <div className="space-y-2">
              {config.custom_questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {q.type === "yes_no" ? "Yes/No" : q.type === "scale" ? "Scale 1-10" : "Open"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomQuestion(q.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new question */}
          {config.custom_questions.length < 3 && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  placeholder={isHindi 
                    ? "जैसे: क्या आज कोई मिलने आया?" 
                    : "e.g., Did anyone visit you today?"
                  }
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Response Type</Label>
                  <Select value={newQuestionType} onValueChange={(v: any) => setNewQuestionType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes_no">Yes / No</SelectItem>
                      <SelectItem value="scale">Scale 1-10</SelectItem>
                      <SelectItem value="open">Open Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={addCustomQuestion}
                  disabled={!newQuestion.trim()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Example questions */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Examples:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    isHindi ? "क्या आज कोई मिलने आया?" : "Did anyone visit you today?",
                    isHindi ? "क्या आपने दोपहर की नींद ली?" : "Did you take a nap today?",
                    isHindi ? "आज का मूड कैसा है?" : "How's your mood today?",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setNewQuestion(example)}
                      className="text-xs px-2 py-1 bg-background border rounded hover:bg-muted transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {config.custom_questions.length >= 3 && (
            <p className="text-sm text-muted-foreground">
              Maximum 3 custom questions reached. Remove one to add another.
            </p>
          )}
        </div>

        {/* Summary */}
        {(config.topics.length > 0 || config.custom_questions.length > 0) && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">During check-ins, the AI will ask about:</span>
              {" "}
              {[
                ...config.topics.map(t => PREDEFINED_TOPICS.find(pt => pt.id === t)?.label || t),
                ...config.custom_questions.map(q => q.question.substring(0, 30) + (q.question.length > 30 ? "..." : ""))
              ].join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthMonitoringCard;
