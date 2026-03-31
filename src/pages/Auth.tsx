import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Circle, Clock, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import sentioLogo from "@/assets/sentio-logo-new.png";

// Password requirements indicator component
const PasswordRequirements = ({ password }: { password: string }) => {
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpperOrSpecial = /[A-Z!@#$%^&*]/.test(password);

  const Requirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
      {met ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {text}
    </div>
  );

  return (
    <div className="space-y-1 mt-2">
      <Requirement met={hasMinLength} text="At least 8 characters" />
      <Requirement met={hasNumber} text="Contains a number" />
      <Requirement met={hasUpperOrSpecial} text="Contains uppercase or special character (!@#$%^&*)" />
    </div>
  );
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState(false);
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showWaitlistConfirmation, setShowWaitlistConfirmation] = useState(false);
  const checkAndRedirectRunning = useRef(false);

  useEffect(() => {
    // Check URL for password recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    if (hashParams.get("type") === "recovery" || urlParams.get("type") === "recovery") {
      setPasswordResetMode(true);
    }

    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If there's an error or no session, ensure clean state
      if (error || !session) {
        return;
      }
      
      // Verify the session is actually valid by making a server request
      // getUser() validates the token against the server, unlike getSession() which only reads localStorage
      const { error: userError } = await supabase.auth.getUser();
      if (userError) {
        // Session is stale/invalid, clear it
        console.log('Stale session detected, clearing...');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      
      // If in password reset mode, don't redirect
      if (passwordResetMode) return;
      
      // Session is valid, redirect
      checkAndRedirect(session.user.id);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        return;
      }
      
      // Handle password recovery event - show reset form instead of redirecting
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordResetMode(true);
        return;
      }
      
      // Don't redirect if in password reset mode
      if (passwordResetMode) return;
      
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED")) {
        checkAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, passwordResetMode]);

  const checkAndRedirect = async (userId: string) => {
    // Prevent concurrent runs (race condition between onAuthStateChange and checkSession)
    if (checkAndRedirectRunning.current) return;
    checkAndRedirectRunning.current = true;

    try {
      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status")
        .eq("user_id", userId)
        .single();

      // If no profile exists (OAuth signup), create one as waitlisted
      if (profileError && profileError.code === "PGRST116") {
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
        
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            user_id: userId,
            full_name: userName,
            subscription_status: "waitlisted",
            waitlist_status: "pending",
            trial_ends_at: null,
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Failed to create profile:", upsertError);
        }

        // Verify profile was actually created
        const { data: verifyProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!verifyProfile) {
          console.error("Profile creation could not be verified for user:", userId);
        }
        
        navigate("/select-plan");
        return;
      }

      // If waitlisted, go to waitlist page
      if (profile?.subscription_status === "waitlisted") {
        navigate("/select-plan");
      } else if (!profile || !profile.subscription_tier) {
        navigate("/select-plan");
      } else {
        navigate("/elders");
      }
    } finally {
      checkAndRedirectRunning.current = false;
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your inbox for the password reset link",
      });
      setResetMode(false);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password rules
    if (newPasswordForReset.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    const hasNumber = /\d/.test(newPasswordForReset);
    const hasUpperOrSpecial = /[A-Z!@#$%^&*]/.test(newPasswordForReset);
    if (!hasNumber || !hasUpperOrSpecial) {
      toast({
        title: "Password too weak",
        description: "Include at least one number and one uppercase letter or special character",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasswordForReset,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Successfully! 🎉",
        description: "You can now use your new password to sign in.",
      });

      setPasswordResetMode(false);
      setNewPasswordForReset("");
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Navigate to elders page since user is now logged in
      navigate("/elders");
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the Privacy Policy and Terms of Service",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    // Password complexity check
    const hasNumber = /\d/.test(password);
    const hasSpecialOrUpper = /[!@#$%^&*A-Z]/.test(password);
    if (!hasNumber || !hasSpecialOrUpper) {
      toast({
        title: "Password too weak",
        description: "Include at least one number and one uppercase letter or special character",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/select-plan`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile as waitlisted (no trial until approved)
      const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            user_id: authData.user.id,
            full_name: fullName,
            phone_number: phoneNumber || null,
            subscription_status: "waitlisted",
            waitlist_status: "pending",
            trial_ends_at: null,
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (profileError) throw profileError;

        setShowWaitlistConfirmation(true);
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Waitlist confirmation after signup
  if (showWaitlistConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/95" />
        <div className="relative w-full max-w-md text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <img src={sentioLogo} alt="Sentio AI" className="h-16 w-auto" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">You're on the Waitlist! 🎉</CardTitle>
              <CardDescription>
                Thank you for signing up, <span className="font-medium text-foreground">{fullName}</span>. We're reviewing your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">✓</div>
                  <span className="text-sm">Account created successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Waiting for approval (usually within 24 hours)</span>
                </div>
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">3</div>
                  <span className="text-sm">5-day free trial begins after approval</span>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  📧 Please check your email (<span className="font-medium text-foreground">{email}</span>) to verify your account. We'll notify you once you're approved.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowWaitlistConfirmation(false);
                }}
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show new password form after clicking reset link
  if (passwordResetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/95" />
        
        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img 
                src={sentioLogo} 
                alt="Sentio AI" 
                className="h-16 w-auto"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>
                Create a new password for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    required
                    minLength={8}
                  />
                  <PasswordRequirements password={newPasswordForReset} />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set New Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/95" />
        
        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img 
                src={sentioLogo} 
                alt="Sentio AI" 
                className="h-16 w-auto"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setResetMode(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/95" />
      
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img 
              src={sentioLogo} 
              alt="Sentio AI" 
              className="h-16 w-auto"
            />
          </div>
          <p className="text-muted-foreground">
            AI-powered care for your loved ones
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-xs"
                        onClick={() => setResetMode(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number (optional)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <PasswordRequirements password={password} />
                  </div>

                  {/* Terms & Privacy Consent */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-tight cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    disabled={loading || !agreedToTerms}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Start Free Trial
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
