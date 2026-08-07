import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useRtl } from "@/hooks/use-rtl";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function Billing() {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  const subscription = useQuery(api.billing.getSubscription);
  const usage = useQuery(api.usage.getUsage);
  const createCheckoutSession = useAction(api.stripeActions.createCheckoutSession);
  const createPortalSession = useAction(api.stripeActions.createPortalSession);

  const [pending, setPending] = useState<PlanId | "portal" | null>(null);

  const currentPlan: PlanId = subscription?.plan ?? "free";

  const handleUpgrade = async (plan: "pro" | "business") => {
    setPending(plan);
    try {
      const result = await createCheckoutSession({ plan });
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }
      toast.error(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setPending(null);
    }
  };

  const handleManage = async () => {
    setPending("portal");
    try {
      const result = await createPortalSession({});
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }
      toast.error(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open billing portal.");
    } finally {
      setPending(null);
    }
  };

  const usageRows = usage
    ? [
        { key: "aiDrafts" as const, label: t("AI drafts", "المسودات بالذكاء الاصطناعي"), icon: Sparkles, used: usage.aiDrafts, limit: usage.limits.aiDrafts },
        { key: "emails" as const, label: t("Emails sent", "الرسائل المرسلة"), icon: Mail, used: usage.emails, limit: usage.limits.emails },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Billing", "الفوترة")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "Every account starts on the Free plan. Upgrade to unlock more AI drafts, email outreach, and more scrape sources — no card required until you do.",
            "يبدأ كل حساب بالخطة المجانية. قم بالترقية لفتح المزيد من المسودات والتواصل بالبريد ومصادر الكشط الإضافية — لا حاجة لبطاقة حتى تقرر الترقية.",
          )}
        </p>
      </div>

      {/* Usage this period */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{t("This month's usage", "استخدام هذا الشهر")}</CardTitle>
              <CardDescription>
                {usage ? `${t("Plan", "الخطة")}: ${PLANS[currentPlan].name}` : t("Loading…", "جارٍ التحميل…")}
              </CardDescription>
            </div>
            {currentPlan !== "free" && (
              <Button variant="outline" size="sm" onClick={handleManage} disabled={pending !== null} className="gap-2">
                {pending === "portal" ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {t("Manage billing", "إدارة الفوترة")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {usage === undefined ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/70" />
                ))}
              </div>
            ) : (
              usageRows.map((row) => {
                const pct = row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 0;
                const nearLimit = pct >= 80;
                return (
                  <div key={row.key}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <row.icon className="size-4 text-primary" />
                        {row.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.limit === 0
                          ? t("not on this plan", "غير متاح بهذه الخطة")
                          : `${row.used} / ${row.limit}`}
                      </span>
                    </div>
                    <Progress value={row.limit === 0 ? 0 : pct} className={cn(nearLimit && "[&>div]:bg-amber-500")} />
                  </div>
                );
              })
            )}
            {usage && usage.limits.aiDrafts > 0 && usage.aiDrafts >= usage.limits.aiDrafts && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                {t(
                  "You've used all your AI drafts for this month. Upgrade below for more.",
                  "لقد استخدمت كل مسوداتك بالذكاء الاصطناعي لهذا الشهر. قم بالترقية أدناه للمزيد.",
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planId, i) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          return (
            <motion.div
              key={planId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className={cn("flex h-full flex-col border-border/80 shadow-sm", isCurrent && "border-primary/40 ring-1 ring-primary/20")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && (
                      <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-primary">
                        {t("Current", "الحالية")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{plan.tagline}</CardDescription>
                  <p className="pt-2">
                    <span className="text-3xl font-bold tracking-tight">${plan.priceUsd}</span>
                    <span className="text-sm text-muted-foreground"> / {t("mo", "شهرياً")}</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm leading-6">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {planId === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      {isCurrent ? t("Your current plan", "خطتك الحالية") : t("Included", "متضمنة")}
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || pending !== null}
                      onClick={() => handleUpgrade(planId as "pro" | "business")}
                    >
                      {pending === planId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isCurrent ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {isCurrent ? t("Active", "مفعّلة") : t("Upgrade", "ترقية")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
