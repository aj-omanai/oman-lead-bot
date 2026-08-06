import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { QUICKSTART_STEPS } from "@/lib/toolkit";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Send,
  Star,
  Users,
} from "lucide-react";
import type { TabId } from "@/pages/Dashboard";

type Lead = Doc<"leads">;

export function Overview({
  leads,
  onNavigate,
}: {
  leads: Lead[] | undefined;
  onNavigate: (tab: TabId) => void;
}) {
  const total = leads?.length ?? 0;
  const drafted = leads?.filter((l) => l.status === "drafted").length ?? 0;
  const sent = leads?.filter((l) => l.status === "sent").length ?? 0;
  const newLeads = total - drafted - sent;
  const avgRating = leads?.length
    ? (leads.reduce((sum, l) => sum + l.rating, 0) / leads.length).toFixed(1)
    : "—";

  const stats = [
    {
      icon: Users,
      label: "Leads collected",
      value: total,
      hint: "in your workspace",
    },
    {
      icon: Bot,
      label: "Pitches drafted",
      value: drafted,
      hint: "ready for review",
    },
    {
      icon: Send,
      label: "Marked sent",
      value: sent,
      hint: "follow up wisely",
    },
    {
      icon: Star,
      label: "Avg. rating",
      value: avgRating,
      hint: "across all leads",
    },
  ];

  const stagePct = (stage: number) =>
    total ? Math.round((stage / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your lead workspace — scrape locally, review here, send from the scripts.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Card className="h-full border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Quick start checklist */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Quick start</CardTitle>
            <p className="text-sm text-muted-foreground">
              From zero to first pitch in six steps.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {QUICKSTART_STEPS.map((step, i) => (
              <button
                key={step.title}
                type="button"
                onClick={() => onNavigate(i === 0 ? "scripts" : i === 5 ? "leads" : "setup")}
                className="group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent/60"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{step.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {step.detail}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Pipeline stages */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pipeline at a glance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Where your leads sit right now.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {[
              { label: "New", value: newLeads, icon: Circle },
              { label: "Drafted", value: drafted, icon: CheckCircle2 },
              { label: "Sent", value: sent, icon: Send },
            ].map((stage) => (
              <div key={stage.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <stage.icon
                      className={cn(
                        "size-4",
                        stage.label === "New" && "text-muted-foreground",
                        stage.label === "Drafted" && "text-primary",
                        stage.label === "Sent" && "text-emerald-600",
                      )}
                    />
                    {stage.label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {stage.value} · {stagePct(stage.value)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stagePct(stage.value)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      stage.label === "New" && "bg-muted-foreground/50",
                      stage.label === "Drafted" && "bg-primary",
                      stage.label === "Sent" && "bg-emerald-500",
                    )}
                  />
                </div>
              </div>
            ))}
            <div className="mt-1 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> import
              leads from your local <span className="font-mono">leads.csv</span>{" "}
              to replace the demo data with real pipeline output.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
