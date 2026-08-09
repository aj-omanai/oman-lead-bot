import { LogoMark, Wordmark } from "@/components/brand";
import { Billing } from "@/components/dashboard/Billing";
import { EmailOutreach } from "@/components/dashboard/EmailOutreach";
import { FollowUps } from "@/components/dashboard/FollowUps";
import { LeadsWorkspace } from "@/components/dashboard/LeadsWorkspace";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { WhatsAppOutreach } from "@/components/dashboard/WhatsAppOutreach";
import { Overview } from "@/components/dashboard/Overview";
import { RtlToggle } from "@/components/RtlToggle";
import { ScriptLibrary } from "@/components/dashboard/ScriptLibrary";
import { Settings } from "@/components/dashboard/Settings";
import { SetupGuide } from "@/components/dashboard/SetupGuide";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  CreditCard,
  FileCode2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  MessageCircle,
  Repeat,
  Settings as SettingsIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export type TabId =
  | "overview"
  | "scripts"
  | "setup"
  | "leads"
  | "pipeline"
  | "email"
  | "whatsapp"
  | "followups"
  | "billing"
  | "settings";

const NAV: Array<{ id: TabId; label: string; labelAr: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", labelAr: "نظرة عامة", icon: LayoutDashboard },
  { id: "scripts", label: "Script Library", labelAr: "مكتبة السكربتات", icon: FileCode2 },
  { id: "setup", label: "Setup Guide", labelAr: "دليل الإعداد", icon: ListChecks },
  { id: "leads", label: "Leads", labelAr: "العملاء المحتملون", icon: Users },
  { id: "pipeline", label: "Pipeline", labelAr: "خط المبيعات", icon: TrendingUp },
  { id: "email", label: "Email Outreach", labelAr: "التواصل بالبريد", icon: Mail },
  { id: "whatsapp", label: "WhatsApp Outreach", labelAr: "التواصل بواتساب", icon: MessageCircle },
  { id: "followups", label: "Follow-ups", labelAr: "المتابعات", icon: Repeat },
  { id: "billing", label: "Billing", labelAr: "الفوترة", icon: CreditCard },
  { id: "settings", label: "Settings", labelAr: "الإعدادات", icon: SettingsIcon },
];

const SIGN_OUT_LABEL = { en: "Sign out", ar: "تسجيل الخروج" };

function labelFor(isRtl: boolean, pair: { en: string; ar: string }): string {
  return isRtl ? pair.ar : pair.en;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { isRtl } = useRtl();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");
  const leads = useQuery(api.leads.list);
  const pendingFollowUps = useQuery(api.followUpStore.pendingCount);

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
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-border/70 bg-sidebar px-4 py-5 lg:flex">
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
                {isRtl ? item.labelAr : item.label}
                {item.id === "followups" && (pendingFollowUps ?? 0) > 0 && (
                  <span className="ms-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-primary">
                    {pendingFollowUps}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <RtlToggle className="mb-2 w-full justify-start" />
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
              {labelFor(isRtl, SIGN_OUT_LABEL)}
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
              <RtlToggle compact />
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
                  {isRtl ? item.labelAr : item.label}
                  {item.id === "followups" && (pendingFollowUps ?? 0) > 0 && (
                    <span className="ms-1 rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-primary-foreground">
                      {pendingFollowUps}
                    </span>
                  )}
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
            {tab === "pipeline" && <Pipeline onNavigate={setTab} />}
            {tab === "email" && <EmailOutreach onNavigate={setTab} />}
            {tab === "whatsapp" && <WhatsAppOutreach onNavigate={setTab} />}
            {tab === "followups" && <FollowUps onNavigate={setTab} />}
            {tab === "billing" && <Billing />}
            {tab === "settings" && <Settings />}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
