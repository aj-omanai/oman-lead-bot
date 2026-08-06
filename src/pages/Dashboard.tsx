import { LogoMark, Wordmark } from "@/components/brand";
import { LeadsWorkspace } from "@/components/dashboard/LeadsWorkspace";
import { Overview } from "@/components/dashboard/Overview";
import { ScriptLibrary } from "@/components/dashboard/ScriptLibrary";
import { Settings } from "@/components/dashboard/Settings";
import { SetupGuide } from "@/components/dashboard/SetupGuide";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  FileCode2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export type TabId = "overview" | "scripts" | "setup" | "leads" | "settings";

const NAV: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "scripts", label: "Script Library", icon: FileCode2 },
  { id: "setup", label: "Setup Guide", icon: ListChecks },
  { id: "leads", label: "Leads", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");
  const leads = useQuery(api.leads.list);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      // fall through — user can still navigate away
      navigate("/");
    }
  };

  const initials = (user?.name || user?.email || "W")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* ========================= SIDEBAR (desktop) ========================= */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-sidebar px-4 py-5 lg:flex">
          <div className="flex items-center gap-2.5 px-2">
            <LogoMark />
            <Wordmark />
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4",
                    tab === item.id ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.name ?? "Guest"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email ?? "Anonymous session"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSignOut}
              className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* ============================ MAIN ============================ */}
        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <LogoMark className="size-8 rounded-lg" />
                <Wordmark />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    tab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <motion.main
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
          >
            {tab === "overview" && <Overview leads={leads} onNavigate={setTab} />}
            {tab === "scripts" && <ScriptLibrary />}
            {tab === "setup" && <SetupGuide />}
            {tab === "leads" && <LeadsWorkspace />}
            {tab === "settings" && <Settings />}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
