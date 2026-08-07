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
import { planAtLeast } from "@/lib/plans";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Mail,
  MailCheck,
  Sparkles,
} from "lucide-react";
import type { TabId } from "@/pages/Dashboard";
import { useState } from "react";
import { toast } from "sonner";

type Lead = Doc<"leads">;

function EmailDialog({ lead }: { lead: Lead }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftEmailPitch = useAction(api.emailOutreach.draftEmailPitch);
  const sendEmail = useAction(api.emailOutreach.sendEmail);

  const handleDraft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const result = await draftEmailPitch({ leadId: lead._id });
      if (result.ok) {
        setDraft({ subject: result.subject, body: result.body });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft the email.");
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendEmail({ leadId: lead._id, subject: draft.subject, body: draft.body });
      if (result.ok) {
        toast.success(t("Email sent", "تم إرسال البريد"), { description: lead.email });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the email.");
    } finally {
      setSending(false);
    }
  };

  const copyBody = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Dialog onOpenChange={(open) => !open && setError(null)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <Mail className="size-3.5" />
          {t("Email", "بريد")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            {lead.name}
          </DialogTitle>
          <DialogDescription>{lead.email}</DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4">
            <p className="text-sm font-semibold">{draft.subject}</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{draft.body}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("No draft yet. Draft one with your free LLM key.", "لا توجد مسودة بعد. صمغها بمفتاح LLM المجاني.")}
          </div>
        )}

        {drafting && (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" />
            {t("Writing your email…", "جارٍ كتابة البريد…")}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyBody} disabled={!draft || sending}>
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? t("Copied", "تم النسخ") : t("Copy", "نسخ")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDraft} disabled={drafting || sending}>
              {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-primary" />}
              {draft ? t("Re-draft", "إعادة الصياغة") : t("Draft with AI", "صياغة بالذكاء الاصطناعي")}
            </Button>
          </div>
          <Button size="sm" onClick={handleSend} disabled={!draft || sending} className="gap-1.5">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}
            {t("Send email", "إرسال البريد")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmailOutreach({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const leads = useQuery(api.leads.list);
  const usage = useQuery(api.usage.getUsage);

  const hasEmailPlan = usage ? planAtLeast(usage.plan, "pro") : false;
  const withEmail = (leads ?? []).filter((l) => l.email && !l.optedOut);
  const withoutEmail = (leads ?? []).filter((l) => !l.email).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Email outreach", "التواصل بالبريد الإلكتروني")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "A second channel alongside WhatsApp — draft and send to any lead with an email address on file. Sends run through your project's integration key.",
            "قناة ثانية إلى جانب واتساب — اصمغ وأرسل لأي عميل لديه بريد إلكتروني مسجّل. تتم عمليات الإرسال عبر مفتاح تكامل مشروعك.",
          )}
        </p>
      </div>

      {!hasEmailPlan && usage !== undefined && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("Email outreach is a Pro feature", "التواصل بالبريد ميزة في خطة Pro")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("Upgrade to draft and send emails alongside your WhatsApp pitches.", "قم بالترقية لصياغة وإرسال رسائل بريدية إلى جانب رسائل واتساب.")}
                </p>
              </div>
            </div>
            <Button onClick={() => onNavigate("billing")} className="shrink-0 gap-1.5">
              <Sparkles className="size-4" />
              {t("View plans", "عرض الخطط")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("Leads with an email address", "العملاء الذين لديهم بريد إلكتروني")}</CardTitle>
          <CardDescription>
            {withEmail.length} {t("ready", "جاهز")}
            {withoutEmail > 0 &&
              ` · ${withoutEmail} ${t("have no email — add one via CSV import", "بلا بريد إلكتروني — أضف عبر استيراد CSV")}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {leads === undefined ? (
            <div className="space-y-2 px-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/70" />
              ))}
            </div>
          ) : withEmail.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Mail className="size-5" />
              </div>
              <p className="text-sm font-medium">{t("No leads with an email yet", "لا يوجد عملاء لديهم بريد إلكتروني بعد")}</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {t("Import a CSV with an \"email\" column from the Leads tab.", "استورد ملف CSV يحتوي عمود \"email\" من تبويب العملاء.")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-52">{t("Company", "الشركة")}</TableHead>
                    <TableHead className="min-w-48">{t("Email", "البريد")}</TableHead>
                    <TableHead className="min-w-32">{t("Status", "الحالة")}</TableHead>
                    <TableHead className="min-w-28">{t("Action", "إجراء")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withEmail.map((lead, i) => (
                    <motion.tr
                      key={lead._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                      className="border-b transition-colors hover:bg-accent/40"
                    >
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{lead.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {lead.status === "sent" ? t("Contacted", "تم التواصل") : t("New", "جديد")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasEmailPlan ? (
                          <EmailDialog lead={lead} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("Upgrade to send", "قم بالترقية للإرسال")}</span>
                        )}
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
              "Do-not-contact leads are hidden here automatically — toggle opt-out from the Leads tab.",
              "يتم إخفاء العملاء المدرجين في قائمة عدم التواصل تلقائياً — بدّل الحالة من تبويب العملاء.",
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
