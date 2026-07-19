import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type OAuthClient = {
  name?: string;
  client_name?: string;
  redirect_uri?: string;
};

type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
  user?: { email?: string };
};

// Local wrapper for the beta supabase.auth.oauth namespace (types not yet public).
const oauthClient = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  };
}).oauth;

function isSafeRelativePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/auth?next=${encodeURIComponent(next)}`;
        return;
      }
      try {
        const { data, error } = await oauthClient.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load authorization details.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauthClient.approveAuthorization(authorizationId)
        : await oauthClient.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("No redirect returned by the authorization server.");
        return;
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(" ") : []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Authorize connection</span>
          </div>
          <CardTitle>Connect {clientName} to your Sentio account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>
          )}
          {!details && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading authorization request…
            </div>
          )}
          {details && (
            <>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{clientName}</strong> will be able to call Sentio's
                enabled tools while you are signed in — it can read your elders, check-ins and alerts on
                your behalf.
              </p>
              {scopes.length > 0 && (
                <div className="text-sm">
                  <div className="font-medium mb-1">Requested permissions</div>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {scopes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                This does not bypass Sentio's permissions or backend policies. Your elders' data stays
                scoped to your account.
              </p>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                </Button>
                <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export { isSafeRelativePath };
