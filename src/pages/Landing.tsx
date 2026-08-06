import { LogoMark, Wordmark } from "@/components/brand";
import { CodeBlock } from "@/components/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FREE_TOOLS, TOOLKIT_FILES } from "@/lib/toolkit";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Database,
  Globe2,
  MessageCircle,
  ShieldCheck,
  Star,
  Terminal,
} from "lucide-react";
import { Link } from "react-router";

const DASHBOARD_URL = "/auth?returnTo=/dashboard";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
      <Badge
        variant="outline"
        className={cn(
          "mb-4 rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-primary",
          dark && "border-teal-300/25 bg-teal-300/10 text-teal-300",
        )}
      >
        {eyebrow}
      </Badge>
      <h2
        className={cn(
          "text-balance text-3xl font-bold tracking-tight sm:text-4xl",
          dark ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-3 text-pretty text-base leading-relaxed sm:text-lg",
          dark ? "text-white/60" : "text-muted-foreground",
        )}
      >
        {subtitle}
      </p>
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: Globe2,
    title: "Scrape public listings",
    body: "Requests + BeautifulSoup extract names, phones and ratings from directory pages. Switch on Playwright for JavaScript-heavy sites — no Apify, no paid API, no card on file.",
    chips: ["BeautifulSoup", "Playwright", "requests"],
  },
  {
    icon: Bot,
    title: "Personalize in Gulf Arabic",
    body: "Gemini's free tier (or Groq) writes a warm, custom خليجي pitch for every lead — name, sector, city and tone included. Every message sounds human because it is.",
    chips: ["Gemini free tier", "Groq free tier"],
  },
  {
    icon: Database,
    title: "Store in SQLite / CSV",
    body: "Leads land in a local SQLite database with dedupe built in, and every run exports a clean CSV. Zero infrastructure, fully yours, offline-friendly.",
    chips: ["SQLite", "CSV export"],
  },
  {
    icon: MessageCircle,
    title: "Deliver over WhatsApp Web",
    body: "A small PyWhatKit / Selenium stub opens WhatsApp Web for a manual QR scan, then sends your approved pitches. No Meta Business API fees.",
    chips: ["PyWhatKit", "Selenium"],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Scrape",
    body: "Point the scraper at any public GCC directory and collect leads with ratings.",
  },
  {
    num: "02",
    title: "Personalize",
    body: "A free-tier LLM drafts a custom Gulf Arabic pitch for each company.",
  },
  {
    num: "03",
    title: "Store",
    body: "Leads and pitches are saved to local SQLite and exported to CSV.",
  },
  {
    num: "04",
    title: "Send",
    body: "You review the drafts, scan the WhatsApp Web QR once, and send.",
  },
];

const FAQS = [
  {
    q: "Is this really 100% free?",
    a: "Yes. The scraper, storage and messenger use free open-source libraries, and the LLM step runs on Google Gemini's or Groq's free tiers. The only thing you spend is your time — and the token cost of the messages you send on WhatsApp, which is already what you pay for a personal line.",
  },
  {
    q: "Will the scraper work on any directory site?",
    a: "Directories differ, so the selectors live in config.py. You tune CARD_SELECTOR, NAME_SELECTOR and friends once per site — that's normally the only per-site change. For JavaScript-heavy pages, set USE_PLAYWRIGHT = True and it renders the page before parsing.",
  },
  {
    q: "Which LLM should I choose?",
    a: "Gemini's free tier is the most generous for this workload and the default. If you prefer an open-weight model, set LLM_PROVIDER = \"groq\" and grab a free key from console.groq.com — no credit card required.",
  },
  {
    q: "How do I keep my WhatsApp account safe?",
    a: "Keep volumes low (the script caps runs at MESSAGES_PER_RUN), personalise everything, send only after manually reviewing each draft, and honour opt-outs immediately. Treat the WhatsApp Web stub as a manual tool, not a blast cannon.",
  },
  {
    q: "Is cold outreach legal in Oman and the GCC?",
    a: "Commercial outreach is generally allowed, but spam is not. Personalised, low-volume B2B outreach with a clear opt-out path is the responsible middle ground. Check local rules for your case — Oman's PDPL and similar GCC data-protection laws apply to how you store and use contact data.",
  },
  {
    q: "What if WhatsApp Web changes and breaks the sender?",
    a: "It happens — the sender is deliberately a small stub so it's cheap to fix. Swap the CSS selector or driver version, or graduate to the official Meta Cloud API when your volume justifies paying for it.",
  },
];

const TERMINAL_LINES = [
  { text: "$ python main.py", dim: false },
  { text: "[scraper] collected 47 unique leads", dim: true },
  { text: "[storage] saved 47 new leads into leads.db", dim: true },
  { text: "[personalize] Al Batinah Marine: 142 chars", dim: true },
  { text: "[personalize] Dukkan Al Khalij: 118 chars", dim: true },
  { text: "[storage] exported 47 leads to leads.csv", dim: true },
  { text: "", dim: true },
  { text: "$ python main.py --send", dim: false },
  { text: "[main] 12 drafted leads ready — opening WhatsApp Web…", dim: true },
];

export default function Landing() {
  const scraperFile = TOOLKIT_FILES.find((f) => f.id === "scraper")!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============================== NAV ============================== */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#toolkit" className="transition-colors hover:text-foreground">
              Toolkit
            </a>
            <a href="#pipeline" className="transition-colors hover:text-foreground">
              Pipeline
            </a>
            <a href="#stack" className="transition-colors hover:text-foreground">
              Stack
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link to={DASHBOARD_URL}>
                Open toolkit
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.9_0.03_197/0.55),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Badge className="mb-5 rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-primary">
              <span className="mr-1.5 size-1.5 rounded-full bg-primary" />
              Zero-cost · 100% free stack
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Cold outreach for Oman &amp; GCC, on a{" "}
              <span className="text-primary">zero-dirham budget</span>.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              A complete Python pipeline that scrapes public business listings,
              writes a custom Gulf Arabic pitch for every lead with a free LLM,
              stores everything in SQLite/CSV, and sends over WhatsApp Web — no
              paid APIs, ever.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild className="gap-2 shadow-md shadow-primary/20">
                <Link to={DASHBOARD_URL}>
                  Get the free toolkit
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#toolkit">Browse the scripts</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border/70 pt-6">
              {[
                ["$0", "monthly tooling"],
                ["8", "runnable files"],
                ["6", "GCC markets"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-bold tracking-tight">{value}</dt>
                  <dd className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Terminal + floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10">
              <CodeBlock
                code={TERMINAL_LINES.map((l) => l.text).join("\n")}
                filename="wasl-lead-gen — terminal"
                maxHeight="none"
              />
            </div>

            {/* Floating pitch card */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
              className="absolute -right-3 -top-8 z-20 hidden w-64 rotate-1 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-black/5 backdrop-blur sm:block"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Drafted pitch · خليجي</p>
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-700">
                  Gemini
                </Badge>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground" dir="rtl" lang="ar">
                السلام عليكم، شركتنا متخصصة بحلول التسويق الرقمي للشركات في
                عُمان. حابين نتعاون معكم ونقدم لكم عرض مناسب لنشاطكم…
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                +968 24 70 1234
              </p>
            </motion.div>

            {/* Floating rating chip */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.75, ease: "easeOut" }}
              className="absolute -bottom-6 -left-4 z-20 hidden items-center gap-2 rounded-full border border-border/80 bg-card/95 px-4 py-2 shadow-lg shadow-black/5 backdrop-blur sm:flex"
            >
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">4.6</span>
              <span className="text-xs text-muted-foreground">
                · 128 reviews · Muscat
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ======================= FREE TOOLS STRIP ======================= */}
      <section className="border-y border-border/70 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Built on free tools only
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {FREE_TOOLS.map((tool) => (
              <span
                key={tool.name}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <span className="size-1.5 rounded-full bg-primary/70" />
                {tool.name}
                <span className="text-xs text-muted-foreground/70">{tool.role}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== STACK ============================== */}
      <section id="stack" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="The stack"
          title="Four small scripts. Zero subscriptions."
          subtitle="Each stage is a focused, readable Python file you own completely — swap providers, tweak selectors, or add steps without fighting a platform."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card className="h-full border-border/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.body}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feature.chips.map((chip) => (
                      <Badge
                        key={chip}
                        variant="secondary"
                        className="rounded-full bg-muted font-normal text-muted-foreground"
                      >
                        {chip}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================= PIPELINE ============================= */}
      <section id="pipeline" className="scroll-mt-20 border-y border-border/70 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="From directory listing to delivered message"
            subtitle="One orchestrator ties the whole flow together. Run it, review the drafts, then send."
          />
          <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
            />
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
                className="relative"
              >
                <div className="relative z-10 flex size-12 items-center justify-center rounded-full border border-primary/25 bg-card font-mono text-sm font-semibold text-primary shadow-sm">
                  {step.num}
                </div>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-14 flex justify-center">
            <Button size="lg" asChild className="gap-2">
              <Link to={DASHBOARD_URL}>
                Start the pipeline
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ========================= TOOLKIT PREVIEW ========================= */}
      <section id="toolkit" className="scroll-mt-20 bg-[#0b1212] py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            dark
            eyebrow="Script library"
            title="Runnable Python, ready to download"
            subtitle="Eight files — scraper, personalizer, storage, messenger, orchestrator, config, requirements and a full README. Sign in to copy or download each one."
          />
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/40">
                wasl-lead-gen/
              </p>
              <ul className="space-y-1">
                {TOOLKIT_FILES.map((file) => (
                  <li key={file.id}>
                    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5">
                      <span className="font-mono text-[13px] text-white/80">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-white/35">
                        {file.language}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <CodeBlock
              code={scraperFile.content}
              filename={scraperFile.name}
              maxHeight="24rem"
            />
          </motion.div>
          <motion.div {...fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="outline" asChild className="border-teal-300/30 bg-transparent text-white hover:bg-white/5 hover:text-white">
              <Link to={DASHBOARD_URL}>
                <Terminal className="size-4" />
                Browse all 8 files
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ========================= COMPLIANCE CALL ========================= */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <motion.div {...fadeUp}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
            <CardContent className="flex flex-col items-start gap-5 px-6 py-7 sm:flex-row sm:items-center">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Use it right, and it stays free</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  The toolkit is a lever, not a loophole. Personalise every
                  message, keep daily volumes low, provide a clear opt-out, and
                  honour it. Treat WhatsApp Web as a manual, human-checked channel —
                  that's both the compliant way and the way that actually gets
                  replies.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered straight"
          subtitle="The honest version of everything you'd want to know before running this."
        />
        <motion.div {...fadeUp} className="mt-10">
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                value={`faq-${i}`}
                className="rounded-xl border border-border/80 bg-card px-5 shadow-sm"
              >
                <AccordionTrigger className="py-4 text-left text-[15px] font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>

      {/* ============================== CTA ============================== */}
      <section className="border-t border-border/70 bg-[#0b1212]">
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,oklch(0.55_0.1_197/0.25),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
            <motion.div {...fadeUp}>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Your pipeline is already free.
                <br />
                Your time isn't — start now.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-white/60">
                Grab the scripts, add one free API key, and have your first
                personalized Gulf Arabic pitch in under an hour.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild className="gap-2 shadow-lg shadow-teal-500/20">
                  <Link to={DASHBOARD_URL}>
                    Get the free toolkit
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
                >
                  <Link to="/auth">Sign in to download</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
            <div className="flex items-center gap-2.5">
              <LogoMark className="size-7 rounded-lg" />
              <Wordmark light />
            </div>
            <p className="text-center text-xs leading-5 text-white/40">
              Built with free tools only. Not affiliated with WhatsApp or Meta.
              <br className="sm:hidden" /> Outreach responsibly.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}
