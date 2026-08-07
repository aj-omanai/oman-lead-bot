import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Crown,
  Loader2,
  Mail,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Lead = Doc<"leads">;
type TabId = "overview" | "scripts" | "setup" | "leads" | "settings" | "billing" | "email";

function EmailCell({ lead }: { lead: Lead }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const setEmail = useMutation(api.leads.setEmail);
  const [value, setValue] = useState(lead.email ?? "");
  const [saved, setSaved] = useState(lead.email ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(lead.email ?? "");
    setSaved(lead.email ?? "");
  }, [lead.email]);

  const commit = async () => {
    const next = value.trim();
    if (next === saved) return;
    setBusy(true);
    try {
      await setEmail({ id: lead._id, email: next });
      setSaved(next);
      toast.success(
        next ? t("Email saved", "تم حفظ البريد") : t("Email removed", "تم حذف البريد"),
      );
    } catch {
      toast.error(t("Couldn't save the email — try again.", "تعذر حفظ البريد — حاول مجدداً."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={t("Add email…", "أضف بريداً…")}
        className="h-8 w-full min-w-44 font-mono text-xs"
      />
      {busy && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      {!busy && saved && <Check className="size-3.5 shrink-0 text-emerald-600" />}
    </div>
  );
}

export function EmailOutreach({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const leads = useQuery(api.leads.list);
  const status = useQuery(api.billing.getBillingStatus);
  const draftEmail = useAction(api.outreach.draftEmail);
  const sendEmail = useAction(api.outreach.sendEmail);

  const [query, setQuery] = useState("");
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [dialogLead, setDialogLead] = useState<Lead | null>(null);
  const [dialogSubject, setDialogSubject] = useState("");
  const [dialogBody, setDialogBody] = useState("");
  const [sending, setSending] = useState(false);

  const isFree = status?.plan === "free";
  const withEmail = (leads ?? []).filter((l) => l.email).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter((lead) => {
      if (onlyWithEmail && !lead.email) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.city.toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, onlyWithEmail]);

  const openDialog = (lead: Lead, subject: string, body: string) => {
    setDialogLead(lead);
    setDialogSubject(subject);
    setDialogBody(body);
  };

  const handleDraft = async (lead: Lead) => {
    setDraftingId(lead._id);
    try {
      const result = await draftEmail({ leadId: lead._id });
      if (result.ok) {
        openDialog(lead, result.subject, result.body);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Drafting failed.", "فشلت الصياغة."));
    } finally {
      setDraftingId(null);
    }
  };

  const handleSend = async () => {
    if (!dialogLead) return;
    setSending(true);
    try {
      const result = await sendEmail({ leadId: dialogLead._id });
      if (result.ok) {
        toast.success(
          t("Email sent!", "تم إرسال البريد!"),
          { description: result.status === "queued" ? t("Queued by the delivery provider.", "في قائمة انتظار مزود الإرسال.") : undefined },
        );
        setDialogLead(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Send failed.", "فشل الإرسال."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Email outreach", "التواصل عبر البريد")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "The second delivery channel next to WhatsApp. Add an email to a lead, draft a Gulf Arabic subject + body with the same free AI key, and send through the built-in email integration — no separate provider to configure.",
            "قناة التواصل الثانية إلى جانب واتساب. أضف بريداً للعميل، وصمّغ موضوعاً ونصاً بالعربية الخليجية بنفس مفتاح الذكاء الاصطناعي المجاني، وأرسل عبر تكامل البريد المدمج — دون الحاجة لمزود إضافي.",
          )}
        </p>
      </div>

      {/* Free plan gate */}
      {status == null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
      ) : isFree ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
            <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Crown className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t("Email outreach is a Pro feature", "التواصل عبر البريد ميزة في خطة Pro")}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                      "Upgrade to Pro ($19/mo) for 300 AI drafts + 200 emails per month, or Business ($49/mo) for 1,500 drafts + 1,000 emails and 5 seats. Your WhatsApp drafting keeps working on the Free plan.",
                      "رقِّ إلى Pro (19$ شهرياً) مقابل 300 صياغة و 200 بريد شهرياً، أو Business (49$ شهرياً) مقابل 1,500 صياغة و 1,000 بريد و 5 مقاعد. صياغة واتساب تستمر على الخطة المجانية.",
                    )}
                  </p>
                </div>
              </div>
              <Button onClick={() => onNavigate("billing")} className="shrink-0 gap-2">
                <Crown className="size-4" />
                {t("View plans", "عرض الخطط")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("You're on", "أنت على خطة")} <span className="font-semibold text-foreground">{status.plan === "pro" ? "Pro" : "Business"}</span> —{" "}
              <span className="font-mono">
                {status.usage.emails.used}/{status.usage.emails.limit}
              </span>{" "}
              {t("emails used this month.", "بريد مستخدم هذا الشهر.")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("billing")} className="gap-1.5">
            <Crown className="size-3.5" />
            {t("Manage plan", "إدارة الخطة")}
          </Button>
        </div>
      )}

      {/* Leads table */}
      {!isFree && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">{t("Leads by email", "العملاء حسب البريد")}</CardTitle>
              <CardDescription>
                {withEmail} {t("of", "من")} {leads?.length ?? 0} {t("have an email address.", "لديهم بريد إلكتروني.")}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Search name, city, email…", "ابحث بالاسم، المدينة، البريد…")}
                  className="h-9 w-full ps-8 sm:w-60"
                />
              </div>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent">
                <input
                  type="checkbox"
                  checked={onlyWithEmail}
                  onChange={(e) => setOnlyWithEmail(e.target.checked)}
                  className="size-3.5 accent-primary"
                />
                {t("Only with email", "فقط من لديه بريد")}
              </label>
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
                <Mail className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">{t("No leads match", "لا توجد نتائج")}</p>
                <p className="text-xs text-muted-foreground">{t("Try a different search or add emails to leads.", "جرّب بحثاً مختلفاً أو أضف بريداً للعملاء.")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-52">{t("Company", "الشركة")}</TableHead>
                      <TableHead className="min-w-48">{t("Email", "البريد")}</TableHead>
                      <TableHead className="min-w-36">{t("Subject", "الموضوع")}</TableHead>
                      <TableHead className="min-w-44">{t("Actions", "الإجراءات")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((lead, i) => (
                      <motion.tr
                        key={lead._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                        className={cn("group border-b transition-colors hover:bg-accent/40", lead.optedOut && "opacity-50")}
                      >
                        <TableCell>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.city}
                            {lead.optedOut && (
                              <Badge variant="outline" className="ms-2 rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700">
                                {t("Opted out", "امتنع")}
                              </Badge>
                            )}
                          </p>
                        </TableCell>
                        <TableCell>
                          <EmailCell lead={lead} />
                        </TableCell>
                        <TableCell className="max-w-52 truncate text-xs text-muted-foreground">
                          {lead.emailSubject ?? (
                            <span className="text-muted-foreground/60">{t("No draft yet", "لا مسودة بعد")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs"
                              disabled={!lead.email || lead.optedOut || draftingId !== null}
                              onClick={() => void handleDraft(lead)}
                            >
                              {draftingId === lead._id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="size-3.5 text-primary" />
                              )}
                              {t("Draft", "صياغة")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs"
                              disabled={!lead.email || !lead.emailSubject || lead.optedOut || sending}
                              onClick={() => openDialog(lead, lead.emailSubject ?? "", lead.emailBody ?? "")}
                            >
                              <Send className="size-3.5 text-emerald-600" />
                              {t("Send", "إرسال")}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft / send dialog */}
      <Dialog open={dialogLead !== null} onOpenChange={(open) => !open && setDialogLead(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              {dialogLead?.name}
            </DialogTitle>
            <DialogDescription>
              {t("AI-drafted email — review before sending", "بريد من صياغة الذكاء الاصطناعي — راجعه قبل الإرسال")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("To", "إلى")}</p>
              <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 font-mono text-sm">
                {dialogLead?.email}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("Subject", "الموضوع")}</p>
              <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm font-medium">{dialogSubject}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("Body", "النص")}</p>
              <div dir="rtl" lang="ar" className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm leading-7">
                {dialogBody}
              </div>
            </div>
            {!dialogLead?.email && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                {t("This lead has no email address — add one in the table first.", "هذا العميل لا يملك بريداً — أضفه من الجدول أولاً.")}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogLead(null)} disabled={sending}>
              {t("Close", "إغلاق")}
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending || !dialogLead?.email} className="gap-1.5">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("Send email", "إرسال البريد")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
