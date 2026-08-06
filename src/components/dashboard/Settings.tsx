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
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Cpu,
  ExternalLink,
  KeyRound,
  Loader2,
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
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage the free LLM integrations behind the "Draft with AI" button.
          Keys live in your project's secure Keys settings — this page only
          shows whether they're configured.
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
                  <h2 className="text-base font-semibold">LLM provider status</h2>
                  {status === undefined ? (
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      Checking…
                    </Badge>
                  ) : configured ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                    >
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700"
                    >
                      Not configured
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {status === undefined
                    ? "Loading your integration status…"
                    : configured
                      ? `The Draft with AI button will use ${
                          activeProvider === "groq" ? "Groq" : "Gemini"
                        } (${status.activeModel}).`
                      : "Add a free key below to unlock live pitch drafting in the Leads tab."}
                </p>
                {status && configured && status.providers.groq && status.providers.gemini && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Both keys are set — Groq takes priority (fastest for drafts).
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
              {testing ? "Testing…" : "Test connection"}
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
                <CheckCircle2 className="mr-2 inline size-4 text-emerald-600" />
              ) : (
                <Circle className="mr-2 inline size-4 text-amber-600" />
              )}
              {testResult.message}
            </div>
          )}
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
                      <CheckCircle2 className="mr-1 size-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      Not configured
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
              Add your free key — 3 steps
            </CardTitle>
            <CardDescription>
              The app never stores keys; it reads them from your project's secure
              Keys / API keys settings.
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
                    <p className="text-sm font-semibold">Your keys stay private</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      The in-app status check only reports whether a key is
                      present — it never reads, stores, or displays the key
                      itself. All LLM calls run server-side.
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
