import { Bell, LogOut, ArrowLeft, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import sentioLogo from "@/assets/sentio-logo-new.png";

interface DashboardHeaderProps {
  elderName: string;
  alertCount?: number;
  onAlertsClick?: () => void;
}

const DashboardHeader = ({ elderName, alertCount = 0, onAlertsClick }: DashboardHeaderProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border/60 bg-background/85 backdrop-blur-md sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/elders")}
              className="hover:bg-muted rounded-full shrink-0"
              aria-label="Back to elders"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={sentioLogo} alt="Sentio" className="h-9 w-auto shrink-0" />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border min-w-0">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Monitoring</span>
              <span className="text-base font-semibold text-foreground truncate max-w-[200px]">{elderName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={onAlertsClick}
              aria-label={`Alerts${alertCount > 0 ? ` (${alertCount} new)` : ""}`}
            >
              <Bell className={`h-5 w-5 ${alertCount > 0 ? "text-destructive" : ""}`} />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-pulse">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-1 ring-primary/20 hover:ring-primary/40 transition-all p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {elderName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium truncate">{elderName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/elders")}>
                  <LayoutGrid className="mr-2 h-4 w-4" /> All elders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Settings className="mr-2 h-4 w-4" /> Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
