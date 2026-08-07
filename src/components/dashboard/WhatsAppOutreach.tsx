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
  CheckCheck,
  Crown,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Lead = Doc<"leads">;
type TabId = "overview" | "scripts" | "setup" | "leads" | "settings" | "billing" | "email" | "whatsapp";

type WaStatus = NonNullable<Lead["whatsappStatus"]>;

const WA_STATUS_STYLE: Record<WaStatus, { label: string; labelAr: string; className: string }> = {
  sent: {
    label: "Sent",
    labelAr: "أُرسلت",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  delivered: {
    label: "Delivered",
    labelAr: "وصلت",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  },
  read: {
    label: "Read",
    labelAr: "قُرئت",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  },
  failed: {
    label: "Failed",
    labelAr: "فشلت",
    className: "border-red-500/25 bg-red-500/10 text-red-700",
  },
};

const WA_ORDER: WaStatus[] = ["sent", "delivered", "read"];

export function WhatsAppOutreach({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const leads = useQuery(api.leads.list);
  const status = useQuery(api.billing.getBillingStatus);
  const sendWhatsApp = useAction(api.whatsapp.sendWhatsApp);

  const [query, setQuery] = useState("");
  const [dialogLead, setDialogLead] = useState<Lead | null>(null);
  const [dialogBody, setDialogBody] = useState("");
  const [sending, setSending] = useState(false);

  const isFree = status?.plan === "free";
  const whatsappConfigured = status?.whatsappConfigured ?? false;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? []).filter((lead) => {
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.city.toLowerCase().includes(q) ||
        lead.phone.includes(q)
      );
    });
  }, [leads, query]);

  const openDialog = (lead: Lead, body: string) => {
    setDialogLead(lead);
    setDialogBody(body);
  };

  const handleSend = async () => {
    if (!dialogLead) return;
    setSending(true);
    try {
      const result = await sendWhatsApp({
        leadId: dialogLead._id,
        message: dialogBody,
      });
      if (result.ok) {
        toast.success(t("WhatsApp message sent!", "تم إرسال رسالة واتساب!"), {
          description: t(
            "Delivery receipts arrive via webhook — status updates live in this table.",
            "تصل إشعارات التسليم عبر الويب هوك — تتحدث الحالة في هذا الجدول مباشرة.",
          ),
        });
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

  const openDraftDialog = (lead: Lead) => {
    // The pitch is the WhatsApp message; open the dialog for review/edit/send.
    openDialog(lead, lead.pitch ?? "");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("WhatsApp outreach", "التواصل عبر واتساب")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "The official WhatsApp Business Cloud API — ToS-compliant and trackable, replacing the old Web automation. Draft a Gulf Arabic pitch, send it, and watch delivery receipts (sent → delivered → read) arrive via webhook.",
            "واجهة واتساب للأعمال الرسمية — متوافقة مع الشروط وقابلة للتتبع، بدلاً من أتمتة الويب القديمة. صمّغ رسالة بالعربية الخليجية، أرسلها، وتابع إشعارات التسليم (أُرسلت ← وصلت ← قُرئت) عبر الويب هوك.",
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
                  <h2 className="text-base font-semibold">{t("WhatsApp sending is a Pro feature", "إرسال واتساب ميزة في خطة Pro")}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                      "Upgrade to Pro ($19/mo) for 300 AI drafts + 200 WhatsApp messages + 200 emails per month, or Business ($49/mo) for 1,500 drafts, 1,000 messages and 1,000 emails. Your AI pitch drafting keeps working on the Free plan.",
                      "رقِّ إلى Pro (19$ شهرياً) مقابل 300 صياغة و 200 رسالة واتساب و 200 بريد شهرياً، أو Business (49$ شهرياً) مقابل 1,500 صياغة و 1,000 رسالة و 1,000 بريد. صياغة الرسائل بالذكاء الاصطناعي تستمر على الخطة المجانية.",
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
                {status.usage.whatsapp.used}/{status.usage.whatsapp.limit}
              </span>{" "}
              {t("WhatsApp messages used this month.", "رسالة واتساب مستخدمة هذا الشهر.")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("billing")} className="gap-1.5">
            <Crown className="size-3.5" />
            {t("Manage plan", "إدارة الخطة")}
          </Button>
        </div>
      )}

      {/* Not configured hint */}
      {!isFree && !whatsappConfigured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            {t(
              "WhatsApp isn't configured yet. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your project's Keys / API keys settings, then point the Meta webhook at",
              "لم يتم إعداد واتساب بعد. أضف WHATSAPP_TOKEN و WHATSAPP_PHONE_NUMBER_ID في إعدادات المفاتيح الآمنة لمشروعك، ثم وجّه ويب هوك Meta إلى",
            )}{" "}
            <span className="font-mono text-foreground">{"<site-url>/whatsapp-webhook"}</span>
            {t(" with WHATSAPP_VERIFY_TOKEN.", " مع WHATSAPP_VERIFY_TOKEN.")}
          </span>
        </div>
      )}

      {/* Leads table */}
      {!isFree && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">{t("Leads on WhatsApp", "العملاء على واتساب")}</CardTitle>
              <CardDescription>
                {filtered.length} {t("of", "من")} {leads?.length ?? 0} {t("shown", "معروض")}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search name, city, phone…", "ابحث بالاسم، المدينة، الهاتف…")}
                className="h-9 w-full ps-8 sm:w-64"
              />
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
                <MessageCircle className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">{t("No leads match", "لا توجد نتائج")}</p>
                <p className="text-xs text-muted-foreground">{t("Try a different search.", "جرّب بحثاً مختلفاً.")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-52">{t("Company", "الشركة")}</TableHead>
                      <TableHead className="min-w-36">{t("Phone", "الهاتف")}</TableHead>
                      <TableHead className="min-w-44">{t("Message", "الرسالة")}</TableHead>
                      <TableHead className="min-w-28">{t("Delivery", "التسليم")}</TableHead>
                      <TableHead className="min-w-32">{t("Actions", "الإجراءات")}</TableHead>
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
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {lead.phone}
                        </TableCell>
                        <TableCell className="max-w-56">
                          {lead.pitch ? (
                            <p dir="rtl" lang="ar" className="line-clamp-2 text-xs leading-5 text-foreground/80">
                              {lead.pitch}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">{t("No message yet", "لا رسالة بعد")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.whatsappStatus ? (
                            <Badge variant="outline" className={cn("rounded-full", WA_STATUS_STYLE[lead.whatsappStatus].className)}>
                              {lead.whatsappStatus === "read" ? (
                                <CheckCheck className="me-1 size-3" />
                              ) : (
                                <MessageCircle className="me-1 size-3" />
                              )}
                              {isRtl ? WA_STATUS_STYLE[lead.whatsappStatus].labelAr : WA_STATUS_STYLE[lead.whatsappStatus].label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">{t("Not sent", "لم تُرسل")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs"
                              disabled={!lead.pitch || lead.optedOut}
                              onClick={() => openDraftDialog(lead)}
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

      {/* Review & send dialog */}
      <Dialog open={dialogLead !== null} onOpenChange={(open) => !open && setDialogLead(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              {dialogLead?.name}
            </DialogTitle>
            <DialogDescription>
              {t("AI-drafted WhatsApp message — review before sending", "رسالة واتساب من صياغة الذكاء الاصطناعي — راجعها قبل الإرسال")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("To", "إلى")}</p>
              <p className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 font-mono text-sm">
                <Phone className="size-3.5 text-muted-foreground" />
                {dialogLead?.phone}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("Message", "الرسالة")}</p>
              <textarea
                dir="rtl"
                lang="ar"
                value={dialogBody}
                onChange={(e) => setDialogBody(e.target.value)}
                rows={7}
                className="w-full resize-none rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm leading-7 outline-none transition-colors focus:border-primary/50 focus:bg-card"
              />
            </div>
            {dialogLead && !dialogLead.pitch && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                {t(
                  "This lead has no AI message yet — draft one in the Leads tab (View → Draft with AI), then send it from here.",
                  "هذا العميل لا يملك رسالة بعد — صمّغها في تبويب العملاء (عرض ← صياغة بالذكاء الاصطناعي)، ثم أرسلها من هنا.",
                )}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogLead(null)} disabled={sending}>
              {t("Close", "إغلاق")}
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending || !dialogLead?.pitch} className="gap-1.5">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("Send on WhatsApp", "إرسال عبر واتساب")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export the ordering helper for badge tooltips elsewhere if needed.
export const _waOrder = WA_ORDER;
