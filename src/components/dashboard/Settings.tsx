import { CodeBlock } from "@/components/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { useRtl } from "@/hooks/use-rtl";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Cpu,
  CreditCard,
  ExternalLink,
  KeyRound,
  Languages,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

const PROVIDERS = [
  {
    id: "groq" as const,
    name: "Groq",
    env: "GROQ_API_KEY",
    free: "Free tier · no credit card",
    url: "https://console.groq.com/keys",
    model: "llama-3.3-70b-versatile",
    note: "LPU-fast open-weight models. Takes priority when both keys are set — ideal for snappy pitch drafting.",
    icon: Cpu,
  },
  {
    id: "gemini" as const,
    name: "Google Gemini",
    env: "GEMINI_API_KEY",
    free: "Free tier · AI Studio",
    url: "https://aistudio.google.com/apikey",
    model: "gemini-2.5-flash",
    note: "Google's flash model — generous free tier and strong Gulf Arabic output.",
    icon: Sparkles,
  },
];

function EnvVarChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${name}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-xs text-primary transition-colors hover:bg-primary/10"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {name}
    </button>
  );
}

export function Settings() {
  const { isRtl, setRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const status = useQuery(api.integrations.integrationStatus);
  const testProvider = useAction(api.pitch.testProvider);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    provider: string | null;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProvider();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        ok: false,
        provider: null,
        message: error instanceof Error ? error.message : "Test request failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  const configured = status?.configured ?? false;
  const activeProvider = status?.activeProvider ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("Settings", "الإعدادات")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "Manage the free LLM integrations behind the \"Draft with AI\" button. Keys live in your project's secure Keys settings — this page only shows whether they're configured.",
            "تحكم في تكاملات الذكاء الاصطناعي المجانية خلف زر \"الصياغة بالذكاء الاصطناعي\". المفاتيح محفوظة في إعدادات المفاتيح الآمنة لمشروعك — هذه الصفحة تعرض فقط هل هي مُعدّة أم لا.",
          )}
        </p>
      </div>

      {/* ===================== Overall status ===================== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={
                  configured
                    ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"
                    : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                }
              >
                {status === undefined ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : configured ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Circle className="size-5" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-semibold">
                    {t("LLM provider status", "حالة مزود الذكاء الاصطناعي")}
                  </h2>
                  {status === undefined ? (
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      {t("Checking…", "جارٍ الفحص…")}
                    </Badge>
                  ) : configured ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                    >
                      {t("Connected", "متصل")}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700"
                    >
                      {t("Not configured", "غير مُعد")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {status === undefined
                    ? t("Loading your integration status…", "جارٍ تحميل حالة التكامل…")
                    : configured
                      ? `${t(
                          "The Draft with AI button will use",
                          "زر الصياغة بالذكاء الاصطناعي سيستخدم",
                        )} ${activeProvider === "groq" ? "Groq" : "Gemini"} (${status.activeModel}).`
                      : t(
                          "Add a free key below to unlock live pitch drafting in the Leads tab.",
                          "أضف مفتاحاً مجانياً أدناه لتفعيل الصياغة المباشرة في تبويب العملاء.",
                        )}
                </p>
                {status && configured && status.providers.groq && status.providers.gemini && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "Both keys are set — Groq takes priority (fastest for drafts).",
                      "تم إعداد المفتاحين — Groq له الأولوية (الأسرع للصياغة).",
                    )}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={configured ? "outline" : "default"}
              onClick={handleTest}
              disabled={testing}
              className="shrink-0 gap-2"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {testing
                ? t("Testing…", "جارٍ الاختبار…")
                : t("Test connection", "اختبار الاتصال")}
            </Button>
          </CardContent>
          {testResult && (
            <div
              className={
                testResult.ok
                  ? "mx-6 mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm leading-6 text-emerald-800"
                  : "mx-6 mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800"
              }
            >
              {testResult.ok ? (
                <CheckCircle2 className="me-2 inline size-4 text-emerald-600" />
              ) : (
                <Circle className="me-2 inline size-4 text-amber-600" />
              )}
              {testResult.message}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ===================== Interface direction ===================== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Languages className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {t("Interface direction", "اتجاه الواجهة")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {isRtl
                    ? "العربية — the entire interface mirrors right-to-left."
                    : "English — the entire interface reads left-to-right."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {isRtl ? "English" : "العربية"}
              </span>
              <Switch
                checked={isRtl}
                onCheckedChange={setRtl}
                aria-label="Toggle Arabic RTL interface"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===================== Billing & delivery ===================== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("Billing & delivery", "الفوترة والتوصيل")}
            </CardTitle>
            <CardDescription>
              {t(
                "Status of the Stripe checkout and the built-in email sender — read from the same secure Keys settings as the LLM keys.",
                "حالة دفع Stripe ومرسل البريد المدمج — تُقرأ من إعدادات المفاتيح الآمنة نفسها كمفاتيح الذكاء الاصطناعي.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-border/70 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{t("Stripe checkout", "دفع Stripe")}</p>
                  {status?.stripeConfigured && status.stripeWebhookConfigured ? (
                    <Badge variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700">
                      <CheckCircle2 className="me-1 size-3" />
                      {t("Configured", "مُعد")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700">
                      <Circle className="me-1 size-3" />
                      {t("Not configured", "غير مُعد")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    "Enables the plan cards in the Billing tab. Checkout uses inline price data — no Stripe products required. Point the webhook at",
                    "يفعّل بطاقات الخطط في تبويب الفوترة. الدفع يستخدم أسعاراً مضمّنة — لا حاجة لمنتجات في Stripe. وجّه الويب هوك إلى",
                  )}{" "}
                  <span className="font-mono text-foreground">{"<site-url>/stripe-webhook"}</span>
                  {t(" with STRIPE_WEBHOOK_SECRET.", " مع STRIPE_WEBHOOK_SECRET.")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <EnvVarChip name="STRIPE_SECRET_KEY" />
                  <EnvVarChip name="STRIPE_WEBHOOK_SECRET" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-border/70 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{t("Email delivery", "توصيل البريد")}</p>
                  {status?.emailConfigured ? (
                    <Badge variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700">
                      <CheckCircle2 className="me-1 size-3" />
                      {t("Ready", "جاهز")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700">
                      <Circle className="me-1 size-3" />
                      {t("Missing key", "المفتاح مفقود")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    "Powers the Email Outreach tab via the built-in integration. No separate provider to configure — usage bills to VLY_INTEGRATION_KEY (auto-injected on this project).",
                    "يشغّل تبويب التواصل عبر البريد عبر التكامل المدمج. لا حاجة لمزود منفصل — الاستخدام يُحاسب على VLY_INTEGRATION_KEY (مُحقن تلقائياً في هذا المشروع).",
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <EnvVarChip name="VLY_INTEGRATION_KEY" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===================== Provider cards ===================== */}
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider, i) => {
          const isConfigured = status?.providers[provider.id] ?? false;
          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Card
                className={
                  isConfigured
                    ? "h-full border-emerald-500/25 shadow-sm"
                    : "h-full border-border/80 shadow-sm"
                }
              >
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        isConfigured
                          ? "flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"
                          : "flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      }
                    >
                      <provider.icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {provider.free}
                      </CardDescription>
                    </div>
                  </div>
                  {isConfigured ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                    >
                      <CheckCircle2 className="me-1 size-3" />
                      {t("Configured", "مُعد")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      {t("Not configured", "غير مُعد")}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm leading-6 text-muted-foreground">{provider.note}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <EnvVarChip name={provider.env} />
                    <span className="font-mono text-xs text-muted-foreground/80">
                      {provider.model}
                    </span>
                  </div>
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Get a free {provider.id === "groq" ? "Groq" : "AI Studio"} key
                    <ExternalLink className="size-3.5" />
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ===================== Where to paste ===================== */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              {t("Add your free key — 3 steps", "أضف مفتاحك المجاني — 3 خطوات")}
            </CardTitle>
            <CardDescription>
              {t(
                "The app never stores keys; it reads them from your project's secure Keys / API keys settings.",
                "التطبيق لا يخزن المفاتيح أبداً؛ يقرأها من إعدادات المفاتيح الآمنة لمشروعك.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-4">
              {[
                {
                  title: "Grab a free key",
                  detail: "Groq (no credit card) at console.groq.com/keys, or Gemini at aistudio.google.com/apikey.",
                },
                {
                  title: "Open your project's Keys settings",
                  detail: "Paste the key under the exact name GROQ_API_KEY or GEMINI_API_KEY.",
                },
                {
                  title: "Come back and press \"Test connection\"",
                  detail: "The status card above flips to Connected and the Draft with AI button goes live.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Running the Python pipeline locally?</p>
                <CodeBlock
                  code={'# config.py — same key, local toolkit\nLLM_PROVIDER = "groq"   # or "gemini"\nGROQ_API_KEY = "gsk_..."\n# GEMINI_API_KEY = "AIza..."'}
                  filename="config.py"
                  maxHeight="none"
                />
              </div>
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t("Your keys stay private", "مفاتيحك تبقى خاصة")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {t(
                        "The in-app status check only reports whether a key is present — it never reads, stores, or displays the key itself. All LLM calls run server-side.",
                        "فحص الحالة داخل التطبيق يعرض فقط هل المفتاح موجود — ولا يقرأ المفتاح أو يخزنه أو يعرضه أبداً. جميع استدعاءات الذكاء الاصطناعي تتم من جهة الخادم.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
