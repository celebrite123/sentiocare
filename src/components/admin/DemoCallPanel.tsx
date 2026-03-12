import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2, User, Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Elder {
  id: string;
  full_name: string;
  phone_number: string;
  preferred_language: string;
  check_in_method: string;
  medical_conditions: string[] | null;
  age: number | null;
}

const DemoCallPanel = () => {
  const { session } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    if (session) fetchElders();
  }, [session]);

  const fetchElders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-demo-call', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'list' },
      });

      if (error) throw error;
      setElders(data.elders || []);
    } catch (err) {
      console.error('Error fetching elders:', err);
      toast.error('Failed to load elders');
    } finally {
      setLoading(false);
    }
  };

  const triggerCall = async (elder: Elder) => {
    setCallingId(elder.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-demo-call', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: 'call', elderId: elder.id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Call initiated to ${elder.full_name}`, {
          description: `Calling ${elder.phone_number}...`,
        });
      } else {
        toast.error(data.error || 'Call failed');
      }
    } catch (err: any) {
      console.error('Call error:', err);
      toast.error(`Failed to call ${elder.full_name}`, {
        description: err.message || 'Please try again',
      });
    } finally {
      setCallingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (elders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No elders found</h3>
          <p className="text-muted-foreground mt-1">Add elders to the platform first to use demo calls.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-primary" />
            Live Demo — Trigger AI Voice Call
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click "Call Now" to initiate a standard daily check-in call to any elder. Perfect for live demos.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {elders.map((elder) => (
          <Card key={elder.id} className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{elder.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{elder.phone_number}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {elder.preferred_language}
                </Badge>
                {elder.age && (
                  <Badge variant="secondary">{elder.age} yrs</Badge>
                )}
                <Badge variant="secondary">{elder.check_in_method}</Badge>
              </div>

              {elder.medical_conditions && elder.medical_conditions.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  Conditions: {elder.medical_conditions.join(', ')}
                </p>
              )}

              <Button
                className="w-full gap-2"
                onClick={() => triggerCall(elder)}
                disabled={callingId === elder.id}
              >
                {callingId === elder.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Call Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoCallPanel;
