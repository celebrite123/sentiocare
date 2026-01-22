import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Loader2 } from "lucide-react";

interface B2BRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff' | 'nurse';
  requiredPermission?: 'can_upload_patients' | 'can_view_reports' | 'can_manage_staff';
}

export const B2BRoute = ({ children, requiredRole, requiredPermission }: B2BRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { organization, membership, loading: orgLoading } = useOrganization();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/b2b/login" replace />;
  }

  if (!organization || !membership) {
    return <Navigate to="/b2b/login" replace />;
  }

  // Check role requirement
  if (requiredRole) {
    const roleHierarchy = { admin: 3, staff: 2, nurse: 1 };
    const userRoleLevel = roleHierarchy[membership.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userRoleLevel < requiredLevel) {
      return <Navigate to="/b2b/dashboard" replace />;
    }
  }

  // Check permission requirement
  if (requiredPermission && !membership[requiredPermission]) {
    return <Navigate to="/b2b/dashboard" replace />;
  }

  return <>{children}</>;
};
