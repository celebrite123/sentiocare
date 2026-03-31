import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { b2bPath } from "@/lib/domain";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import sentioLogo from "@/assets/sentio-logo-new.png";

export default function B2BLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Login failed - no user returned");
      }

      // Step 2: Check membership using the user's own record
      // The RLS policy "Users can view their own membership" allows this
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role, name')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Membership check error:', memberError);
        await supabase.auth.signOut();
        throw new Error("Failed to verify staff membership. Please contact your administrator.");
      }

      if (!membership) {
        await supabase.auth.signOut();
        throw new Error("You are not registered as a hospital staff member. Please contact your administrator.");
      }

      toast.success(`Welcome back, ${membership.name}!`);
      navigate("/b2b/dashboard");
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={sentioLogo} alt="Sentio" className="h-14 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl">Hospital Staff Login</CardTitle>
          <CardDescription>
            Access the Post-Discharge Care Portal
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-2">Powered by Sentio AI</p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@hospital.com"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}