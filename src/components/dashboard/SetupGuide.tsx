import { CodeBlock } from "@/components/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUICKSTART_STEPS } from "@/lib/toolkit";
import { motion } from "framer-motion";
import { ExternalLink, KeyRound } from "lucide-react";

const API_KEYS = [
  {
    name: "Google Gemini",
    free: "Free tier · AI Studio",
    url: "https://aistudio.google.com/apikey",
    env: "GEMINI_API_KEY",
    note: "The default provider. Paste the key into config.py — the toolkit is a local script, so there are no server env vars to configure.",
  },
  {
    name: "Groq",
    free: "Free tier · no credit card",
    url: "https://console.groq.com/keys",
    env: "GROQ_API_KEY",
    note: "Alternative provider with open-weight models. Set LLM_PROVIDER = \"groq\" in config.py to switch.",
  },
];

export function SetupGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup guide</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          The toolkit runs on your own machine — it's a local Python project.
          Everything here mirrors the README you downloaded, step by step.
        </p>
      </div>

      {/* API key cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {API_KEYS.map((key, i) => (
          <motion.div
            key={key.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="h-full border-border/80 shadow-sm">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{key.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{key.free}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full bg-primary/5 font-mono text-primary">
                  {key.env}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{key.note}</p>
                <a
                  href={key.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Get a free key
                  <ExternalLink className="size-3.5" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {QUICKSTART_STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Card className="border-border/80 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-6 sm:p-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {step.detail}
                  </p>
                  {step.code && (
                    <div className="mt-4">
                      <CodeBlock code={step.code} filename="terminal" maxHeight="none" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold">Before you send anything</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>· Review every draft pitch — the LLM is fast, not infallible.</li>
            <li>· Keep runs small: the script caps at{" "}
              <span className="font-mono text-foreground">MESSAGES_PER_RUN</span>{" "}
              per run. Respect it.</li>
            <li>· Scan the WhatsApp QR once, then verify the first message manually.</li>
            <li>· Provide an opt-out line and honour replies asking to stop.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
