import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRtl } from "@/hooks/use-rtl";
import { QUICKSTART_STEPS } from "@/lib/toolkit";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  CreditCard,
  Crown,
  Mail,
  Send,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TabId } from "@/pages/Dashboard";

type Lead = Doc<"leads">;

const STAGE_COLORS: Record<string, string> = {
  new: "hsl(var(--muted-foreground))",
  drafted: "hsl(var(--primary))",
  sent: "#10b981",
};

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
  const billing = useQuery(api.billing.getBillingStatus);
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  const stats = [
    {
      icon: Users,
      label: t("Leads collected", "العمليات المحتملة"),
      value: total,
      hint: t("in your workspace", "في مساحة عملك"),
    },
    {
      icon: Bot,
      label: t("Pitches drafted", "المسودات الجاهزة"),
      value: drafted,
      hint: t("ready for review", "جاهزة للمراجعة"),
    },
    {
      icon: Send,
      label: t("Marked sent", "تم إرسالها"),
      value: sent,
      hint: t("follow up wisely", "تابع بحكمة"),
    },
    {
      icon: Star,
      label: t("Avg. rating", "متوسط التقييم"),
      value: avgRating,
      hint: t("across all leads", "لكل العمليات"),
    },
  ];

  const stagePct = (stage: number) =>
    total ? Math.round((stage / total) * 100) : 0;

  const pipelineData = [
    { key: "new", label: t("New", "جديد"), value: newLeads },
    { key: "drafted", label: t("Drafted", "مسودة"), value: drafted },
    { key: "sent", label: t("Sent", "مرسل"), value: sent },
  ].filter((stage) => stage.value > 0);

  const planLabel =
    billing == null
      ? "…"
      : billing.plan === "business"
        ? "Business"
        : billing.plan === "pro"
          ? "Pro"
          : t("Free", "مجانية");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("Pipeline overview", "نظرة عامة على خط الإنتاج")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Your lead workspace — scrape locally, review here, send from the scripts.",
            "مساحة عمل العمليات — اكشط محلياً، راجع هنا، وأرسل من السكربتات.",
          )}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick start checklist */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("Quick start", "البدء السريع")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("From zero to first pitch in six steps.", "من الصفر إلى أول رسالة في ست خطوات.")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {QUICKSTART_STEPS.map((step, i) => (
              <button
                key={step.title}
                type="button"
                onClick={() => onNavigate(i === 0 ? "scripts" : i === 5 ? "leads" : "setup")}
                className="group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-start transition-colors hover:bg-accent/60"
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
                <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Pipeline chart (recharts) */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("Pipeline at a glance", "المراحل بلمحة")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("Where your leads sit right now.", "أين توجد عملياتك الآن.")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {total === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("No leads yet — import your first CSV.", "لا عملاء بعد — استورد أول ملف CSV.")}
              </div>
            ) : (
              <>
                <div className="relative h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        cornerRadius={6}
                        strokeWidth={0}
                      >
                        {pipelineData.map((entry) => (
                          <Cell key={entry.key} fill={STAGE_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [
                          `${value} · ${stagePct(value)}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tracking-tight">{total}</span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("leads", "عميل")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { key: "new", icon: Circle, label: t("New", "جديد"), value: newLeads },
                    { key: "drafted", icon: CheckCircle2, label: t("Drafted", "مسودة"), value: drafted },
                    { key: "sent", icon: Send, label: t("Sent", "مرسل"), value: sent },
                  ].map((stage) => (
                    <div key={stage.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: STAGE_COLORS[stage.key] }}
                        />
                        {stage.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {stage.value} · {stagePct(stage.value)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Tip:", "نصيحة:")}</span>{" "}
                  {t("bring your real pipeline output in with", "أدخل نتائج خط الإنتاج الحقيقية عبر")}{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate("leads")}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t("Import CSV", "استيراد CSV")}
                  </button>{" "}
                  {t("in the Leads tab — rows are deduped by name and phone.", "في تبويب العملاء — تتم إزالة التكرار حسب الاسم والهاتف.")}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Usage & plan */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {t("Usage & plan", "الاستخدام والخطة")}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  billing && billing.plan !== "free"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {planLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Metered this month, server-side.", "يُحتسب هذا الشهر من جهة الخادم.")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {billing == null ? (
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-lg bg-muted/70" />
                <div className="h-10 animate-pulse rounded-lg bg-muted/70" />
              </div>
            ) : (
              <>
                {[
                  {
                    icon: Sparkles,
                    label: t("AI drafts", "الصياغات"),
                    used: billing.usage.aiDrafts.used,
                    limit: billing.usage.aiDrafts.limit,
                    iconClassName: "text-primary",
                    progressClassName: "",
                  },
                  {
                    icon: Mail,
                    label: t("Emails", "البريد"),
                    used: billing.usage.emails.used,
                    limit: billing.usage.emails.limit,
                    iconClassName: "text-emerald-600",
                    progressClassName: "[&>div]:bg-emerald-500",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <item.icon className={cn("size-4", item.iconClassName)} />
                        {item.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.used}/{item.limit}
                      </span>
                    </div>
                    <Progress
                      value={
                        item.limit === 0
                          ? 0
                          : Math.min(Math.round((item.used / item.limit) * 100), 100)
                      }
                      className={cn("h-2", item.progressClassName)}
                    />
                  </div>
                ))}
                <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-3 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {billing.plan === "free"
                      ? t("Free plan:", "الخطة المجانية:")
                      : t("Paid plan:", "خطة مدفوعة:")}
                  </span>{" "}
                  {billing.plan === "free"
                    ? t(
                        "20 AI drafts a month, no emails. Upgrade for 300–1,500 drafts and up to 1,000 emails.",
                        "20 صياغة شهرياً وبدون بريد. رقِّ للحصول على 300–1,500 صياغة وحتى 1,000 بريد.",
                      )
                    : t(
                        "Quotas reset on renewal. Usage is enforced before every paid call.",
                        "تتجدد الحصص عند التجديد. يُطبَّق الاستخدام قبل كل عملية مدفوعة.",
                      )}
                </div>
                <Button onClick={() => onNavigate("billing")} className="w-full gap-2">
                  <CreditCard className="size-4" />
                  {billing.plan === "free"
                    ? t("Upgrade plan", "ترقية الخطة")
                    : t("Manage billing", "إدارة الفوترة")}
                </Button>
                {billing.plan === "free" && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Crown className="size-3.5 text-primary" />
                    {t("Pro: $19/mo · Business: $49/mo", "Pro: 19$/شهر · Business: 49$/شهر")}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
