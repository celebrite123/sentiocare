import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowWaitlisted?: boolean;
}

export const ProtectedRoute = ({ children, allowWaitlisted = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isWaitlisted, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!allowWaitlisted && !loading && !subLoading && user && isWaitlisted) {
      navigate("/select-plan");
    }
  }, [user, loading, subLoading, isWaitlisted, navigate, allowWaitlisted]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!allowWaitlisted && isWaitlisted)) {
    return null;
  }

  return <>{children}</>;
};
