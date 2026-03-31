import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Upload,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";
import { b2bPath } from "@/lib/domain";
import sentioLogo from "@/assets/sentio-logo-new.png";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/staff", label: "Staff", icon: Users, adminOnly: true },
];

interface B2BNavbarProps {
  alertCount?: number;
}

export const B2BNavbar = ({ alertCount = 0 }: B2BNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { organization, member } = useOrganization();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate(b2bPath("/login"));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo & Org Name */}
        <div className="flex items-center gap-4">
          <Link to={b2bPath("/dashboard")} className="flex items-center gap-3">
            <img src={sentioLogo} alt="Sentio" className="h-9 w-auto" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-6 w-px bg-border" />
              <span className="font-semibold text-base">{organization?.name || "Hospital"}</span>
              <Badge variant="secondary" className="text-xs">
                B2B
              </Badge>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const href = b2bPath(item.path);
            const isActive = location.pathname === href;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.label === "Alerts" && alertCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {alertCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Alert Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate(b2bPath("/alerts"))}
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {member?.name ? getInitials(member.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block text-sm">
                  {member?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{member?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {member?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {member?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate(b2bPath("/settings"))}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t bg-background p-4">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const href = b2bPath(item.path);
              const isActive = location.pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.label === "Alerts" && alertCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {alertCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
