import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Bell, LogOut, User, LayoutDashboard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import AlertsPanel from "./AlertsPanel";
import sentioLogo from "@/assets/sentio-logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(user ? "/elders" : "/")}
            >
              <img 
                src={sentioLogo} 
                alt="Sentio AI" 
                className="h-10 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    className={isActive("/elders") ? "bg-muted" : ""}
                    onClick={() => navigate("/elders")}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </>
              ) : null}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Alerts Bell */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setAlertsOpen(true)}
                  >
                    <Bell className="h-5 w-5" />
                  </Button>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Family Member</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/elders")}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Center
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate("/auth")}>
                    Log In
                  </Button>
                  <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
                    Sign Up
                  </Button>
                </div>
              )}

              {/* Mobile menu button - only show for logged out users */}
              {!user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col gap-2">
                {user ? (
                  <Button
                    variant="ghost"
                    className={`justify-start ${isActive("/elders") ? "bg-muted" : ""}`}
                    onClick={() => {
                      navigate("/elders");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Log In
                    </Button>
                    <Button
                      className="justify-start bg-primary hover:bg-primary/90"
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <AlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} />
    </>
  );
};

export default Navbar;
