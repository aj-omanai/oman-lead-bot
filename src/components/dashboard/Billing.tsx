import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type PlanId = "free" | "pro" | "business";

const PLAN_CARDS: Array<{
  id: PlanId;
  name: string;
  price: number;
  blurbEn: string;
  blurbAr: string;
  featuresEn: string[];
  featuresAr: string[];
  icon: typeof Crown;
  highlight?: boolean;
}> = [
  {
    id: "free",
    name: "Free",
    price: 0,
    blurbEn: "Try the pipeline end-to-end.",
    blurbAr: "جرّب خط الإنتاج كاملاً.",
    featuresEn: ["20 AI drafts / month", "0 emails", "1 scrape source"],
    featuresAr: ["20 صياغة ذكاء اصطناعي شهرياً", "0 بريد إلكتروني", "مصدر كشط واحد"],
    icon: Sparkles,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    blurbEn: "For solo operators scaling outreach.",
    blurbAr: "للمستقلين الذين يوسّعون حملاتهم.",
    featuresEn: ["300 AI drafts / month", "200 emails / month", "5 scrape sources"],
    featuresAr: ["300 صياغة ذكاء اصطناعي شهرياً", "200 بريد إلكتروني شهرياً", "5 مصادر كشط"],
    icon: Zap,
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: 49,
    blurbEn: "For small teams going all-in.",
    blurbAr: "للفرق الصغيرة الجادة.",
    featuresEn: [
      "1,500 AI drafts / month",
      "1,000 emails / month",
      "20 scrape sources",
      "5 seats",
    ],
    featuresAr: [
      "1,500 صياغة ذكاء اصطناعي شهرياً",
      "1,000 بريد إلكتروني شهرياً",
      "20 مصدر كشط",
      "5 مقاعد",
    ],
    icon: Crown,
  },
];

export function Billing() {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const status = useQuery(api.billing.getBillingStatus);
  const checkout = useAction(api.stripe.createCheckoutSession);
  const portal = useAction(api.stripe.createBillingPortalSession);
  const [busy, setBusy] = useState<"pro" | "business" | "portal" | null>(null);

  // Toast once when Stripe redirects back after a successful checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success(t("Subscription updated — welcome aboard!", "تم تحديث الاشتراك — أهلاً بك!"));
      params.delete("checkout");
      window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
    }
  }, [t]);

  const handleUpgrade = async (plan: "pro" | "business") => {
    setBusy(plan);
    try {
      const origin = window.location.origin;
      const result = await checkout({
        plan,
        successUrl: `${origin}/?checkout=success`,
        cancelUrl: `${origin}/?tab=billing`,
      });
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(t("Checkout couldn't be created — is STRIPE_SECRET_KEY set?", "تعذر إنشاء الدفع — هل تم إعداد STRIPE_SECRET_KEY؟"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Checkout failed.", "فشل الدفع."));
    } finally {
      setBusy(null);
    }
  };

  const handleManage = async () => {
    setBusy("portal");
    try {
      const result = await portal({ returnUrl: `${window.location.origin}/?tab=billing` });
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Billing portal failed.", "فشل فتح بوابة الفوترة."));
    } finally {
      setBusy(null);
    }
  };

  const meter = (used: number, limit: number) =>
    limit === 0 ? 0 : Math.min(Math.round((used / limit) * 100), 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Billing", "الفوترة")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "Usage is metered server-side before every AI draft and email send. Upgrade to lift the monthly caps — Checkout is wired with inline price data, so no Stripe products need to be created.",
            "يُحتسب الاستخدام على الخادم قبل كل صياغة وإرسال. ارفع السقف الشهري بالترقية — تم ربط الدفع بالأسعار المضمّنة، فلا حاجة لإنشاء منتجات في Stripe.",
          )}
        </p>
      </div>

      {/* Stripe not configured hint */}
      {status && !status.stripeConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-amber-500/25 bg-amber-500/5 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t("Stripe is not configured yet", "لم يتم إعداد Stripe بعد")}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                      "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your project's Keys / API keys settings to activate Checkout. Use test-mode keys while you try it out, and point the webhook at",
                      "أضف STRIPE_SECRET_KEY و STRIPE_WEBHOOK_SECRET في إعدادات المفاتيح الآمنة لمشروعك لتفعيل الدفع. استخدم مفاتيح الوضع التجريبي وجّه الويب هوك إلى",
                    )}{" "}
                    <span className="font-mono text-foreground">{"<site-url>/stripe-webhook"}</span>
                    {t(" with STRIPE_WEBHOOK_SECRET.", " مع STRIPE_WEBHOOK_SECRET.")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-card px-2.5 py-1 font-mono text-xs text-amber-800"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current plan + usage meters */}
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("Your plan & usage", "خطتك والاستخدام")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("This month", "هذا الشهر")}
                    {status.currentPeriodEnd
                      ? ` · ${t("renews", "يتجدد")} ${new Date(status.currentPeriodEnd).toLocaleDateString()}`
                      : ""}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  status.plan === "free"
                    ? "text-muted-foreground"
                    : "border-primary/25 bg-primary/10 text-primary",
                )}
              >
                {status.plan === "free"
                  ? t("Free plan", "الخطة المجانية")
                  : status.plan === "pro"
                    ? "Pro"
                    : "Business"}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: Sparkles,
                  label: t("AI drafts", "الصياغات"),
                  used: status.usage.aiDrafts.used,
                  limit: status.usage.aiDrafts.limit,
                  iconClassName: "text-primary",
                  progressClassName: "",
                },
                {
                  icon: Mail,
                  label: t("Emails sent", "البريد المرسل"),
                  used: status.usage.emails.used,
                  limit: status.usage.emails.limit,
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
                      {item.used} / {item.limit}
                    </span>
                  </div>
                  <Progress
                    value={meter(item.used, item.limit)}
                    className={cn("h-2", item.progressClassName)}
                  />
                  {item.limit === 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t("Included with Pro and Business.", "متضمنة في Pro و Business.")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_CARDS.map((plan, i) => {
          const isCurrent = status?.plan === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
            >
              <Card
                className={cn(
                  "relative h-full border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  plan.highlight && "border-primary/30",
                  isCurrent && "ring-1 ring-primary/40",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 start-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground rtl:translate-x-1/2">
                    {t("Popular", "الأكثر شيوعاً")}
                  </span>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg",
                          plan.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <plan.icon className="size-4" />
                      </div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    {isCurrent && (
                      <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-primary">
                        <CheckCircle2 className="me-1 size-3" />
                        {t("Current", "الحالية")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold tracking-tight">
                      {plan.price === 0 ? "$0" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t(plan.blurbEn, plan.blurbAr)}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <ul className="space-y-2.5">
                    {(isRtl ? plan.featuresAr : plan.featuresEn).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.id === "free" ? (
                    <Button variant="outline" disabled className="w-full">
                      {t("Free — included with your account", "مجانية — مضمّنة مع حسابك")}
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="outline" onClick={handleManage} disabled={busy === "portal"} className="w-full gap-2">
                      {busy === "portal" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                      {t("Manage billing", "إدارة الفوترة")}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => void handleUpgrade(plan.id === "pro" ? "pro" : "business")}
                      disabled={busy !== null || (status ? !status.stripeConfigured : false)}
                      className="w-full gap-2"
                    >
                      {busy === plan.id ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                      {t(`Upgrade to ${plan.name}`, `الترقية إلى ${plan.name}`)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" />
        {t(
          "Quotas are enforced server-side before every paid call — the free AI-drafting key can't be drained past your plan. Cancel anytime from the Stripe portal.",
          "تُطبَّق الحصص على الخادم قبل كل عملية مدفوعة — لا يمكن استنزاف مفتاح الصياغة المجاني بعد حد خطتك. يمكنك الإلغاء في أي وقت من بوابة Stripe.",
        )}
      </p>
    </div>
  );
}
