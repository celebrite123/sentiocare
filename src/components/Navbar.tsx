import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Bell, LogOut, User, LayoutDashboard, Shield, Building2 } from "lucide-react";
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
import { useB2BMembership } from "@/hooks/useB2BMembership";
import AlertsPanel from "./AlertsPanel";
import sentioLogo from "@/assets/sentio-logo-new.png";

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { isB2BStaff, loading: b2bLoading } = useB2BMembership();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isLanding = location.pathname === "/";
  
  const getDashboardPath = () => isB2BStaff ? "/b2b/dashboard" : "/elders";
  const getDashboardLabel = () => isB2BStaff ? "Hospital Dashboard" : "Dashboard";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(user ? getDashboardPath() : "/")}
            >
              <img 
                src={sentioLogo} 
                alt="Sentio AI" 
                className="h-10 w-auto"
                width={40}
                height={40}
                fetchPriority="high"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {user && !b2bLoading ? (
                <Button
                  variant="ghost"
                  className={isActive(getDashboardPath()) ? "bg-muted" : ""}
                  onClick={() => navigate(getDashboardPath())}
                >
                  {isB2BStaff ? <Building2 className="h-4 w-4 mr-2" /> : <LayoutDashboard className="h-4 w-4 mr-2" />}
                  {getDashboardLabel()}
                </Button>
              ) : isLanding ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => scrollToSection("features")}>
                    Features
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => scrollToSection("pricing")}>
                    Pricing
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => scrollToSection("faq")}>
                    FAQ
                  </Button>
                </>
              ) : null}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {!isB2BStaff && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      onClick={() => setAlertsOpen(true)}
                    >
                      <Bell className="h-5 w-5" />
                    </Button>
                  )}

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
                        <p className="text-xs text-muted-foreground">
                          {isB2BStaff ? "Hospital Staff" : "Family Member"}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(getDashboardPath())}>
                        {isB2BStaff ? <Building2 className="h-4 w-4 mr-2" /> : <LayoutDashboard className="h-4 w-4 mr-2" />}
                        {getDashboardLabel()}
                      </DropdownMenuItem>
                      {!isB2BStaff && (
                        <DropdownMenuItem onClick={() => navigate("/profile")}>
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </DropdownMenuItem>
                      )}
                      {!adminLoading && isAdmin && (
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

              {/* Mobile menu button */}
              {(!user || isLanding) && (
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
                {!user && isLanding && (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => { scrollToSection("features"); setMobileMenuOpen(false); }}>
                      Features
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => { scrollToSection("pricing"); setMobileMenuOpen(false); }}>
                      Pricing
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => { scrollToSection("faq"); setMobileMenuOpen(false); }}>
                      FAQ
                    </Button>
                  </>
                )}
                {user ? (
                  <Button
                    variant="ghost"
                    className={`justify-start ${isActive(getDashboardPath()) ? "bg-muted" : ""}`}
                    onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }}
                  >
                    {isB2BStaff ? <Building2 className="h-4 w-4 mr-2" /> : <LayoutDashboard className="h-4 w-4 mr-2" />}
                    {getDashboardLabel()}
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                      Log In
                    </Button>
                    <Button className="justify-start bg-primary hover:bg-primary/90" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                      Get Started
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
