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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
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
  FileUp,
  Inbox,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Star,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Lead = Doc<"leads">;
type Status = Lead["status"];

const STATUS_ORDER: Status[] = ["new", "drafted", "sent", "replied"];

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
  replied: {
    label: "Replied",
    labelAr: "تم الرد",
    className: "border-violet-500/25 bg-violet-500/10 text-violet-700",
  },
};

function PitchDialog({ lead }: { lead: Lead }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [copied, setCopied] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const setStatus = useMutation(api.leads.setStatus);
  const setPitch = useMutation(api.leads.setPitch);
  const generatePitch = useAction(api.pitch.generatePitch);
  const sendWhatsApp = useAction(api.whatsapp.sendWhatsAppMessage);

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

  const handleSendWhatsApp = async () => {
    setSending(true);
    setSendError(null);
    try {
      const result = await sendWhatsApp({ leadId: lead._id });
      if (result.ok) {
        toast.success(t("Sent via WhatsApp", "تم الإرسال عبر واتساب"), { description: lead.name });
      } else {
        setSendError(result.message);
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send the message.");
    } finally {
      setSending(false);
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
        {sendError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{sendError}</span>
          </div>
        )}

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
              <Button variant="outline" size="sm" onClick={handleDraft} disabled={drafting}>
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
            <Button size="sm" onClick={handleDraft} disabled={drafting} className="gap-1.5">
              {drafting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("Draft with AI", "صياغة بالذكاء الاصطناعي")}
            </Button>
          ) : (
            lead.status !== "sent" &&
            lead.status !== "replied" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void setStatus({ id: lead._id, status: "sent" })}
                >
                  {t("Mark as sent", "تحديد كمرسلة")}
                </Button>
                <Button size="sm" onClick={handleSendWhatsApp} disabled={sending} className="gap-1.5">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {t("Send via WhatsApp", "إرسال عبر واتساب")}
                </Button>
              </div>
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
  email?: string;
  rating?: number;
  reviews?: number;
  city?: string;
  category?: string;
  source?: string;
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
  email: "email",
  emailaddress: "email",
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
        field === "email" ||
        field === "city" ||
        field === "category" ||
        field === "source" ||
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
          placeholder={'name,phone,email,rating,reviews,city,category,source,pitch,status\n"WJ Towell & Co LLC",+96824526001,info@wjtowell.com,,,"Ruwi, Oman",Construction Companies,yellowpages.om,,new'}
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
  const toggleOptOut = useMutation(api.leads.toggleOptOut);
  const seededRef = useRef(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
    return (leads ?? []).filter((lead) => {
      if (category !== "all" && lead.category !== category) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.city.toLowerCase().includes(q) ||
        lead.phone.includes(q)
      );
    });
  }, [leads, query, category]);

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
              "42 real leads scraped from yellowpages.om (Oman's live business directory). Draft pitches live with your free LLM key, import your own",
              "42 عميلاً حقيقياً تم كشطها من yellowpages.om (دليل الأعمال العُماني المباشر). اصمغ الرسائل مباشرة بمفتاح LLM المجاني، واستورد ملف",
            )}{" "}
            <span className="font-mono">leads.csv</span>
            {t(", and track what you've sent.", "، وتابع ما أرسلته.")}
          </p>
        </div>
        <ImportCsvDialog />
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
                    <TableHead className="min-w-36">Phone</TableHead>
                    <TableHead className="min-w-28">Pitch</TableHead>
                    <TableHead className="min-w-32">Status</TableHead>
                    <TableHead className="min-w-24 text-center">
                      {t("Contact", "التواصل")}
                    </TableHead>
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
                        lead.optedOut && "opacity-60",
                      )}
                    >
                      <TableCell>
                        <p className="flex items-center gap-1.5 font-medium">
                          {lead.name}
                          {lead.optedOut && (
                            <Badge
                              variant="outline"
                              className="gap-1 rounded-full border-destructive/25 bg-destructive/10 text-[10px] text-destructive"
                            >
                              <UserX className="size-2.5" />
                              {t("DNC", "لا اتصال")}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.source}
                          {lead.email ? ` · ${lead.email}` : ""}
                        </p>
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
                      <TableCell className="text-center">
                        <Switch
                          checked={!lead.optedOut}
                          onCheckedChange={(checked) =>
                            void toggleOptOut({ id: lead._id, optedOut: !checked })
                          }
                          aria-label={
                            lead.optedOut
                              ? t("Re-enable contact", "إعادة تفعيل التواصل")
                              : t("Mark do-not-contact", "وضع علامة عدم التواصل")
                          }
                          title={
                            lead.optedOut
                              ? t("Opted out — click to re-enable", "تم الإيقاف — انقر لإعادة التفعيل")
                              : t("Click to mark do-not-contact", "انقر لوضع علامة عدم التواصل")
                          }
                        />
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {t(
              "Click a status badge to move it through the pipeline: new → drafted → sent → replied. \"Send via WhatsApp\" needs a connected number in Settings; \"Replied\" is set automatically when a lead answers. Toggle Contact off to mark a lead do-not-contact — it's then blocked from drafting and sending on every channel.",
              "انقر على شارة الحالة لتحريك العميل عبر المراحل: جديد ← مسودة ← مرسل ← تم الرد. زر \"إرسال عبر واتساب\" يحتاج رقماً متصلاً من الإعدادات؛ حالة \"تم الرد\" تُضبط تلقائياً عند رد العميل. أوقف مفتاح التواصل لوضع علامة عدم التواصل — سيُمنع حينها من الصياغة والإرسال في كل القنوات.",
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
