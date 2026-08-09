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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileUp,
  Gauge,
  Globe,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldOff,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Lead = Doc<"leads">;
type Status = Lead["status"];

const STATUS_ORDER: Status[] = ["new", "drafted", "sent"];

const STATUS_STYLE: Record<
  Status,
  { label: string; labelAr: string; className: string }
> = {
  new: {
    label: "New",
    labelAr: "جديد",
    className: "border-border bg-muted text-muted-foreground",
  },
  drafted: {
    label: "Drafted",
    labelAr: "مسودة",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  sent: {
    label: "Sent",
    labelAr: "مرسل",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  },
};

const SCORE_BAND_STYLE = {
  hot: {
    label: "Hot",
    labelAr: "ساخن",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  },
  warm: {
    label: "Warm",
    labelAr: "دافئ",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  },
  cold: {
    label: "Cold",
    labelAr: "بارد",
    className: "border-border bg-muted text-muted-foreground",
  },
} as const;

type ScoreBand = keyof typeof SCORE_BAND_STYLE;

function bandOf(score: number): ScoreBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/** Deterministic 0–100 lead score with a Hot/Warm/Cold band; reasons on hover. */
function ScoreBadge({ lead }: { lead: Lead }) {
  const { isRtl } = useRtl();
  const score = lead.score;
  if (score === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const meta = SCORE_BAND_STYLE[bandOf(score)];
  const title = (lead.scoreReasons ?? []).length
    ? (lead.scoreReasons ?? []).join(" · ")
    : undefined;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex cursor-help items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {score}
      <span className="opacity-60">·</span>
      {isRtl ? meta.labelAr : meta.label}
    </span>
  );
}

function PitchDialog({ lead }: { lead: Lead }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [copied, setCopied] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const setStatus = useMutation(api.leads.setStatus);
  const setPitch = useMutation(api.leads.setPitch);
  const updateNotes = useMutation(api.leads.updateNotes);
  const generatePitch = useAction(api.pitch.generatePitch);

  // Keep the notes editor in sync if the lead changes elsewhere.
  useEffect(() => {
    setNotes(lead.notes ?? "");
  }, [lead.notes]);

  const saveNotes = async () => {
    setNotesBusy(true);
    setNotesSaved(false);
    try {
      await updateNotes({ id: lead._id, notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1600);
    } catch {
      // silent — the textarea stays editable
    } finally {
      setNotesBusy(false);
    }
  };

  const copyPitch = async () => {
    await navigator.clipboard.writeText(lead.pitch ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDraft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const result = await generatePitch({ leadId: lead._id });
      if (result.ok) {
        await setPitch({ id: lead._id, pitch: result.pitch });
      } else {
        setDraftError(result.message);
      }
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to draft the pitch.");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          {t("View", "عرض")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            {lead.name}
          </DialogTitle>
          <DialogDescription>
            {t("Drafted Gulf Arabic pitch", "مسودة رسالة بالعربية الخليجية")} · {lead.city}
          </DialogDescription>
        </DialogHeader>

        {lead.optedOut && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
            <ShieldOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>
              {t(
                "Do-not-contact is on for this lead — AI drafting and sending are blocked until you re-enable contact in the Leads tab.",
                "التواصل ممنوع مع هذا العميل — تم إيقاف الصياغة والإرسال حتى تعيد تفعيل التواصل من تبويب العملاء.",
              )}
            </span>
          </div>
        )}

        {lead.pitch ? (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
            <p
              dir="rtl"
              lang="ar"
              className="whitespace-pre-wrap text-[15px] leading-8 text-foreground"
            >
              {lead.pitch}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t(
              "No pitch yet. Draft one right here with your free LLM key, or run",
              "لا توجد رسالة بعد. صمغها الآن بمفتاح LLM المجاني، أو شغّل",
            )}{" "}
            <span className="font-mono text-foreground">python main.py</span>{" "}
            {t("locally and import the output as CSV.", "محلياً واستورد الناتج كملف CSV.")}
          </div>
        )}

        {drafting && (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" />
            Writing your خليجي pitch…
          </div>
        )}
        {draftError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{draftError}</span>
          </div>
        )}

        {/* Notes — handy for recording why a lead opted out. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("Notes", "ملاحظات")}
            </p>
            {notesSaved && <span className="text-xs font-medium text-emerald-600">{t("Saved", "تم الحفظ")}</span>}
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("e.g. asked to be removed from outreach lists.", "مثال: طلب إزالته من قوائم التواصل.")}
            className="h-16 resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void saveNotes()}
              disabled={notesBusy}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              {notesBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              {t("Save notes", "حفظ الملاحظات")}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPitch}
              disabled={!lead.pitch || drafting}
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? t("Copied", "تم النسخ") : t("Copy pitch", "نسخ الرسالة")}
            </Button>
            {lead.pitch && (
              <Button variant="outline" size="sm" onClick={handleDraft} disabled={drafting || lead.optedOut}>
                {drafting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4 text-primary" />
                )}
                {t("Re-draft with AI", "إعادة الصياغة بالذكاء الاصطناعي")}
              </Button>
            )}
          </div>
          {!lead.pitch ? (
            <Button size="sm" onClick={handleDraft} disabled={drafting || lead.optedOut} className="gap-1.5">
              {drafting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("Draft with AI", "صياغة بالذكاء الاصطناعي")}
            </Button>
          ) : (
            lead.status !== "sent" && !lead.optedOut && (
              <Button
                size="sm"
                onClick={() => void setStatus({ id: lead._id, status: "sent" })}
              >
                {t("Mark as sent", "تحديد كمرسلة")}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CsvLead {
  name: string;
  phone: string;
  rating?: number;
  reviews?: number;
  city?: string;
  category?: string;
  source?: string;
  email?: string;
  pitch?: string;
  status?: "new" | "drafted" | "sent";
}

const HEADER_ALIASES: Record<string, keyof CsvLead> = {
  name: "name",
  company: "name",
  business: "name",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  rating: "rating",
  stars: "rating",
  reviews: "reviews",
  reviewcount: "reviews",
  city: "city",
  town: "city",
  category: "category",
  sector: "category",
  source: "source",
  sourceurl: "source",
  email: "email",
  mail: "email",
  pitch: "pitch",
  message: "pitch",
  status: "status",
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

const VALID_STATUSES = new Set(["new", "drafted", "sent"]);

function parseCsv(text: string): { leads: CsvLead[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const leads: CsvLead[] = [];
  let skipped = 0;

  if (lines.length === 0) return { leads, skipped };

  const header = splitCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z]/g, ""),
  );
  const fields = header.map((h) => HEADER_ALIASES[h] ?? null);

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const lead: CsvLead = { name: "", phone: "" };
    let hasData = false;
    fields.forEach((field, i) => {
      if (!field || !cells[i]) return;
      hasData = true;
      const value = cells[i];
      if (field === "rating" || field === "reviews") {
        const num = Number.parseFloat(value);
        if (!Number.isNaN(num)) lead[field] = num;
      } else if (field === "status") {
        if (VALID_STATUSES.has(value)) lead.status = value as CsvLead["status"];
      } else if (
        field === "name" ||
        field === "phone" ||
        field === "city" ||
        field === "category" ||
        field === "source" ||
        field === "email" ||
        field === "pitch"
      ) {
        lead[field] = value;
      }
    });
    if (!hasData || lead.name.length < 2) {
      skipped += 1;
      continue;
    }
    leads.push(lead);
    if (leads.length >= 500) break;
  }
  return { leads, skipped };
}

function DiscoveryPoolDialog() {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [scraping, setScraping] = useState(false);
  const [importing, setImporting] = useState(false);

  const stats = useQuery(api.scrapeStore.getPoolStats);
  const pool = useQuery(api.scrapeStore.listPool, {
    category: category === "all" ? undefined : category,
    limit: 8,
  });
  const scrapeYellowpages = useAction(api.scraping.scrapeYellowpages);
  const importFromPool = useMutation(api.scrapeStore.importFromPool);

  const lastScraped = stats?.lastScrapedAt
    ? new Date(stats.lastScrapedAt).toLocaleString()
    : null;

  const handleScrape = async () => {
    setScraping(true);
    try {
      const result = await scrapeYellowpages({});
      toast.success(t("Scrape finished", "اكتمل الكشط"), {
        description: `${result.found} ${t("listings found", "إدراج")} · ${result.added} ${t("new", "جديد")} · ${result.updated} ${t("refreshed", "مُحدَّث")}${result.errors.length > 0 ? ` · ${result.errors.length} ${t("errors", "أخطاء")}` : ""}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Scrape failed.", "فشل الكشط."));
    } finally {
      setScraping(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importFromPool({
        category: category === "all" ? undefined : category,
      });
      toast.success(
        t(
          `Imported ${result.inserted} new lead${result.inserted === 1 ? "" : "s"}`,
          `تم استيراد ${result.inserted} عميلاً جديداً`,
        ),
        { description: t("Duplicates were skipped automatically.", "تم تخطي التكرار تلقائياً.") },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Import failed.", "فشل الاستيراد."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="size-4" />
          {t("Discovery pool", "مستودع الاكتشاف")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            {t("Server-side discovery pool", "مستودع الاكتشاف على الخادم")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "A daily Convex cron scrapes yellowpages.om into this shared pool — no local Python required. Import rows into your workspace, deduped by name + phone.",
              "كرون Convex يومي يكشط yellowpages.om في هذا المستودع المشترك — دون الحاجة إلى بايثون محلي. استورد الصفوف إلى مساحة عملك مع إزالة التكرار حسب الاسم والهاتف.",
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
          <div>
            <span className="text-lg font-bold">{stats?.total ?? "…"}</span>{" "}
            <span className="text-muted-foreground">{t("leads in pool", "عميل في المستودع")}</span>
          </div>
          <div>
            <span className="text-lg font-bold">{stats?.categories.length ?? "…"}</span>{" "}
            <span className="text-muted-foreground">{t("categories", "قطاع")}</span>
          </div>
          <div className="text-muted-foreground">
            {t("Last scraped:", "آخر كشط:")}{" "}
            <span className="font-medium text-foreground">
              {lastScraped ?? t("never yet", "لم يحدث بعد")}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full sm:w-56">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All categories", "كل القطاعات")}</SelectItem>
              {(stats?.categories ?? []).map((c) => (
                <SelectItem key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => void handleScrape()}
            disabled={scraping || importing}
            className="gap-2"
          >
            {scraping ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {scraping ? t("Scraping…", "جارٍ الكشط…") : t("Scrape now", "اكشط الآن")}
          </Button>
          <Button
            onClick={() => void handleImport()}
            disabled={importing || scraping || (stats?.total ?? 0) === 0}
            className="gap-2"
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t("Import into my leads", "استيراد إلى عملائي")}
          </Button>
        </div>

        {/* Preview */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border/80">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-start text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-start">{t("Name", "الاسم")}</th>
                <th className="px-4 py-2 text-start">{t("Phone", "الهاتف")}</th>
                <th className="px-4 py-2 text-start">{t("City", "المدينة")}</th>
                <th className="px-4 py-2 text-start">{t("Category", "القطاع")}</th>
              </tr>
            </thead>
            <tbody>
              {pool === undefined ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    {t("Loading…", "جارٍ التحميل…")}
                  </td>
                </tr>
              ) : pool.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    {t(
                      "Pool is empty — run the first scrape now, or wait for tomorrow's cron.",
                      "المستودع فارغ — شغّل أول كشط الآن، أو انتظر كرون الغد.",
                    )}
                  </td>
                </tr>
              ) : (
                pool.map((row) => (
                  <tr key={row._id} className="border-t border-border/60">
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {row.phone}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.city}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{row.category}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="justify-start">
          <p className="text-xs leading-5 text-muted-foreground">
            {t(
              "Imports are capped at 500 leads per run and deduped against your workspace by name + phone.",
              "الاستيراد محدود بـ 500 عميل في كل مرة وتتم إزالة التكرار حسب الاسم والهاتف في مساحة عملك.",
            )}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCsvDialog() {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importLeads = useMutation(api.leads.importLeads);

  const parsed = useMemo(() => (text.trim() ? parseCsv(text) : null), [text]);
  const previewCount = parsed?.leads.length ?? 0;

  const handleImport = async () => {
    if (!parsed || previewCount === 0) {
      setError("No valid rows found — make sure the first line is a header with a 'name' column.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const result = await importLeads({ leads: parsed.leads });
      toast.success(
        `Imported ${result.inserted} new lead${result.inserted === 1 ? "" : "s"}`,
        { description: "Duplicates were skipped automatically." },
      );
      setOpen(false);
      setText("");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="size-4" />
          {t("Import CSV", "استيراد CSV")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" />
            Import leads from your pipeline
          </DialogTitle>
          <DialogDescription>
            {t(
              "Paste the contents of your local",
              "الصق محتوى ملف",
            )}{" "}
            <span className="font-mono">leads.csv</span>{" "}
            {t(
              "(or any sheet) — rows are deduped by name + phone.",
              "(أو أي جدول) — تتم إزالة التكرار حسب الاسم والهاتف.",
            )}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'name,phone,rating,reviews,city,category,source,pitch,status\n"WJ Towell & Co LLC",+96824526001,,,"Ruwi, Oman",Construction Companies,yellowpages.om,,new'}
          className="h-44 resize-none font-mono text-xs leading-5"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Headers are matched flexibly (name/company/business, phone/telephone, …).
          Only <span className="font-mono">name</span> is required.
        </p>

        {parsed && (
          <p className="text-xs text-muted-foreground">
            {previewCount} row{previewCount === 1 ? "" : "s"} ready to import
            {parsed.skipped > 0 && ` · ${parsed.skipped} skipped (missing name)`}
            {previewCount >= 500 && " · capped at 500 per import"}
          </p>
        )}
        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={importing}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button onClick={handleImport} disabled={importing || previewCount === 0} className="gap-1.5">
            {importing ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            Import {previewCount || ""} lead{previewCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadsWorkspace() {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const leads = useQuery(api.leads.list);
  const seed = useMutation(api.leads.seed);
  const setStatus = useMutation(api.leads.setStatus);
  const setOptOut = useMutation(api.leads.setOptOut);
  const seededRef = useRef(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "score">("default");
  const [rescoring, setRescoring] = useState(false);
  const rescoreAll = useMutation(api.scoring.rescoreAll);

  // Runs once per session: seed() self-guards — it seeds fresh workspaces,
  // migrates the legacy fictional demo set to the real yellowpages.om sample,
  // and is a no-op for workspaces the user has already filled themselves.
  useEffect(() => {
    if (leads && !seededRef.current) {
      seededRef.current = true;
      void seed();
    }
  }, [leads, seed]);

  const categories = useMemo(
    () => Array.from(new Set((leads ?? []).map((l) => l.category))).sort(),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (leads ?? []).filter((lead) => {
      if (category !== "all" && lead.category !== category) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.city.toLowerCase().includes(q) ||
        lead.phone.includes(q)
      );
    });
    if (sortBy === "score") {
      matches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    return matches;
  }, [leads, query, category, sortBy]);

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const result = await rescoreAll({});
      toast.success(
        t(
          `Re-scored ${result.updated} lead${result.updated === 1 ? "" : "s"}`,
          `أُعيد تقييم ${result.updated} عميلاً`,
        ),
        {
          description: t(
            "Scores reflect contactability, category, engagement and freshness.",
            "تعكس الدرجات إمكانية التواصل والقطاع والتفاعل والحداثة.",
          ),
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Re-scoring failed.", "فشلت إعادة التقييم."),
      );
    } finally {
      setRescoring(false);
    }
  };

  const cycleStatus = (lead: Lead) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(lead.status) + 1) % STATUS_ORDER.length];
    void setStatus({ id: lead._id, status: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("Leads workspace", "مساحة العملاء المحتملين")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "89 real leads scraped from yellowpages.om (Oman's live business directory) across 12 categories. Draft pitches live with your free LLM key, import your own",
              "89 عميلاً حقيقياً تم كشطها من yellowpages.om (دليل الأعمال العُماني المباشر) عبر 12 قطاعاً. اصمغ الرسائل مباشرة بمفتاح LLM المجاني، واستورد ملف",
            )}{" "}
            <span className="font-mono">leads.csv</span>
            {t(", and track what you've sent.", "، وتابع ما أرسلته.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void handleRescore()} disabled={rescoring}>
            {rescoring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Gauge className="size-4" />
            )}
            {t("Re-score all", "إعادة تقييم الكل")}
          </Button>
          <DiscoveryPoolDialog />
          <ImportCsvDialog />
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">
              {t("Collected leads", "العمليات التي تم جمعها")}
            </CardTitle>
            <CardDescription>
              {filtered.length} {t("of", "من")} {leads?.length ?? 0} {t("shown", "معروض")}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search name, city, phone…", "ابحث بالاسم، المدينة، الهاتف…")}
                className="h-9 w-full ps-8 sm:w-64"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All categories", "كل القطاعات")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "default" | "score")}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("Default order", "الترتيب الافتراضي")}</SelectItem>
                <SelectItem value="score">{t("Score: high → low", "الدرجة: من الأعلى للأدنى")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {leads === undefined ? (
            <div className="space-y-2 px-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/70" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-5" />
              </div>
              <p className="text-sm font-medium">No leads match</p>
              <p className="text-xs text-muted-foreground">
                Try a different search or category filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-52">Company</TableHead>
                    <TableHead className="min-w-40">Category</TableHead>
                    <TableHead className="min-w-36">City</TableHead>
                    <TableHead className="min-w-20">Rating</TableHead>
                    <TableHead className="min-w-28">Score</TableHead>
                    <TableHead className="min-w-36">Phone</TableHead>
                    <TableHead className="min-w-28">Pitch</TableHead>
                    <TableHead className="min-w-32">Status</TableHead>
                    <TableHead className="min-w-32">{t("No-contact", "لا تواصل")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead, i) => (
                    <motion.tr
                      key={lead._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                      className={cn(
                        "group border-b transition-colors hover:bg-accent/40",
                        lead.optedOut && "bg-muted/40 opacity-70",
                      )}
                    >
                      <TableCell>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.source}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.category}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.city}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {lead.rating.toFixed(1)}
                          <span className="text-xs text-muted-foreground">
                            ({lead.reviews})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <ScoreBadge lead={lead} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {lead.phone}
                      </TableCell>
                      <TableCell>
                        <PitchDialog lead={lead} />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => cycleStatus(lead)}
                          title="Click to cycle status"
                          className="transition-opacity hover:opacity-80"
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "cursor-pointer rounded-full",
                              STATUS_STYLE[lead.status].className,
                            )}
                          >
                            {isRtl
                              ? STATUS_STYLE[lead.status].labelAr
                              : STATUS_STYLE[lead.status].label}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!lead.optedOut}
                            onCheckedChange={(checked) =>
                              void setOptOut({ id: lead._id, optedOut: !checked })
                            }
                            aria-label={t("Allow contact", "السماح بالتواصل")}
                          />
                          {lead.optedOut && (
                            <Badge
                              variant="outline"
                              className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700"
                            >
                              <ShieldOff className="me-1 size-3" />
                              {t("Opted out", "امتنع")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-1 border-t px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t(
              "Click a status badge to move it through the pipeline: new → drafted → sent. The \"Draft with AI\" button uses your free Groq or Gemini key.",
              "انقر على شارة الحالة لتحريك العميل عبر المراحل: جديد ← مسودة ← مرسل. زر \"الصياغة بالذكاء الاصطناعي\" يستخدم مفتاح Groq أو Gemini المجاني.",
            )}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldOff className="size-3.5 text-amber-600" />
            {t(
              "The No-contact switch blocks AI drafting and sending on both channels.",
              "مفتاح \"لا تواصل\" يوقف الصياغة والإرسال بالذكاء الاصطناعي على القناتين.",
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
