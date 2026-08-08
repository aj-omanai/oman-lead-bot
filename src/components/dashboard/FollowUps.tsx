import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { PendingFollowUp } from "@/convex/followUpStore";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Crown,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Send,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Follow-ups review tab.
 *
 * A daily cron drafts a polite follow-up for every lead pitched 3+ days ago
 * with no reply. Nothing sends on its own — a human reviews each one here:
 * approve (routes through the normal WhatsApp/email send paths), edit inline,
 * or skip. Approved-but-stale rows are caught server-side and auto-skipped.
 */

/** Locale-aware "x minutes/hours/days ago" relative to the original send. */
function elapsedSince(ts: number | null | undefined, locale: string): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

function FollowUpRow({
  row,
  index,
  isRtl,
  t,
  onApprove,
  onEdit,
  onSkip,
  busy,
}: {
  row: PendingFollowUp;
  index: number;
  isRtl: boolean;
  t: (en: string, ar: string) => string;
  onApprove: (row: PendingFollowUp) => void;
  onEdit: (row: PendingFollowUp) => Promise<void>;
  onSkip: (row: PendingFollowUp) => void;
  busy: boolean;
}) {
  const isEmail = row.channel === "email";
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(row.draftSubject ?? "");
  const [editBody, setEditBody] = useState(row.draftBody);
  const [saving, setSaving] = useState(false);

  const stale = !row.lead || row.lead.optedOut || row.lead.status !== "sent";
  const leadLabel = row.lead?.name ?? t("Deleted lead", "عميل محذوف");

  const saveEdit = async () => {
    if (!editBody.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit({
        ...row,
        draftBody: editBody,
        draftSubject: isEmail ? editSubject : undefined,
      });
      setEditing(false);
    } catch {
      // Save failed — keep edit mode open so the text isn't lost.
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isRtl ? 24 : -24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card className={cn("border-border/80 shadow-sm", stale && "opacity-70")}>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                isEmail ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              {isEmail ? <Mail className="size-4" /> : <MessageCircle className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{leadLabel}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.lead?.city}
                {row.lead?.phone ? ` · ${row.lead.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="rounded-full bg-muted/50 text-muted-foreground">
                {isEmail ? t("Email", "بريد") : t("WhatsApp", "واتساب")}
              </Badge>
              {row.lead?.lastContactedAt && (
                <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
                  {t("sent ", "أُرسل ")}
                  {elapsedSince(row.lead.lastContactedAt, isRtl ? "ar" : "en")}
                </Badge>
              )}
              {row.lead?.optedOut && (
                <Badge variant="outline" className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700">
                  {t("Opted out", "امتنع")}
                </Badge>
              )}
              {row.lead && !row.lead.optedOut && row.lead.status !== "sent" && (
                <Badge variant="outline" className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-700">
                  {t("Status changed", "تغيّرت الحالة")}
                </Badge>
              )}
            </div>
          </div>

          {isEmail && (
            <p className="mt-3 text-sm font-medium text-foreground/90">
              {row.draftSubject || t("(no subject)", "(بدون موضوع)")}
            </p>
          )}

          {editing ? (
            <div className="mt-3 space-y-3">
              {isEmail && (
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder={t("Subject…", "الموضوع…")}
                  className="w-full rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-card"
                />
              )}
              <textarea
                dir="rtl"
                lang="ar"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm leading-7 outline-none transition-colors focus:border-primary/50 focus:bg-card"
              />
            </div>
          ) : (
            <div
              dir="rtl"
              lang="ar"
              className="mt-3 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-7 text-foreground/85"
            >
              {row.draftBody}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" className="gap-1.5" disabled={saving || !editBody.trim()} onClick={() => void saveEdit()}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  {t("Save", "حفظ")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="size-3.5" />
                  {t("Cancel", "إلغاء")}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" className="gap-1.5" disabled={busy || stale} onClick={() => onApprove(row)}>
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  {t("Approve & send", "اعتماد وإرسال")}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  {t("Edit", "تعديل")}
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={busy} onClick={() => onSkip(row)}>
                  <SkipForward className="size-3.5" />
                  {t("Skip", "تخطي")}
                </Button>
              </>
            )}
          </div>

          {stale && (
            <p className="mt-3 text-xs leading-5 text-amber-700">
              {t(
                "This lead opted out or its status changed since this follow-up was drafted — approving will skip it automatically.",
                "امتنع هذا العميل أو تغيّرت حالته منذ صياغة هذه المتابعة — الاعتماد سيُتخطاها تلقائياً.",
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FollowUps({ onNavigate }: { onNavigate: (tab: "billing") => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const followUps = useQuery(api.followUpStore.listPending);
  const status = useQuery(api.billing.getBillingStatus);
  const approveAndSend = useAction(api.followUps.approveAndSend);
  const editFollowUp = useMutation(api.followUpStore.editFollowUp);
  const skipFollowUp = useMutation(api.followUpStore.skipFollowUp);

  const [busyId, setBusyId] = useState<string | null>(null);

  const isFree = status?.plan === "free";
  const pendingCount = followUps?.length ?? 0;

  const handleApprove = async (row: PendingFollowUp) => {
    setBusyId(row.id);
    try {
      const result = await approveAndSend({ id: row.id });
      if (result.ok) {
        toast.success(t("Follow-up sent!", "تم إرسال المتابعة!"), {
          description:
            row.channel === "email"
              ? t("The email follow-up is on its way.", "بريد المتابعة في طريقه.")
              : t("The WhatsApp follow-up is on its way.", "متابعة واتساب في طريقها."),
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Approve failed.", "فشل الاعتماد."));
    } finally {
      setBusyId(null);
    }
  };

  const handleEdit = async (row: PendingFollowUp) => {
    try {
      await editFollowUp({
        id: row.id,
        draftSubject: row.draftSubject ?? undefined,
        draftBody: row.draftBody,
      });
      toast.success(t("Follow-up updated.", "تم تحديث المتابعة."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Couldn't save — try again.", "تعذر الحفظ — حاول مجدداً."));
      throw error;
    }
  };

  const handleSkip = async (row: PendingFollowUp) => {
    setBusyId(row.id);
    try {
      await skipFollowUp({ id: row.id });
      toast.info(t("Follow-up skipped — the lead won't be re-queued.", "تم تخطي المتابعة — لن يُعاد ترتيب العميل."));
    } catch {
      toast.error(t("Couldn't skip — try again.", "تعذر التخطي — حاول مجدداً."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Follow-ups", "المتابعات")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "A daily job drafts a polite follow-up for every lead pitched 3+ days ago with no reply. Nothing sends on its own — review, edit, approve, or skip.",
            "مهمة يومية تصمّغ متابعة مهذبة لكل عميل أُرسلت له رسالة قبل 3 أيام دون رد. لا شيء يُرسل تلقائياً — راجع، عدّل، اعتمد، أو تخطَّ.",
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
                  <h2 className="text-base font-semibold">{t("Follow-up automation is a Pro feature", "أتمتة المتابعات ميزة في خطة Pro")}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    {t(
                      "Upgrade to Pro ($19/mo) or Business ($49/mo) and the daily job will draft a follow-up for every lead you pitched 3+ days ago — you just approve the ones worth sending.",
                      "رقِّ إلى Pro (19$ شهرياً) أو Business (49$ شهرياً) وستصمّغ المهمة اليومية متابعة لكل عميل خاطبته قبل 3 أيام — عليك فقط اعتماد ما يستحق الإرسال.",
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
              {pendingCount > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{pendingCount}</span>{" "}
                  {t("follow-up(s) waiting for review.", "متابعة بانتظار المراجعة.")}
                </>
              ) : (
                t("Nothing waiting — new drafts appear here after the daily job runs.", "لا شيء بانتظار — تظهر المسودات الجديدة هنا بعد تشغيل المهمة اليومية.")
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("billing")} className="gap-1.5">
            <Crown className="size-3.5" />
            {t("Manage plan", "إدارة الخطة")}
          </Button>
        </div>
      )}

      {/* Review queue */}
      {!isFree && (
        <div className="space-y-4">
          {followUps === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          ) : pendingCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Sparkles className="size-5" />
                </span>
                <p className="text-sm font-medium">{t("No follow-ups need your review right now.", "لا توجد متابعات تحتاج مراجعتك الآن.")}</p>
                <p className="max-w-md text-xs leading-5 text-muted-foreground">
                  {t(
                    "When a pitch you sent stays unanswered for 3 days, the daily job drafts a polite nudge and queues it here for your approval.",
                    "عندما تبقى رسالة أرسلتها دون رد لمدة 3 أيام، تصمّغ المهمة اليومية تذكيراً مهذباً وتضعه هنا بانتظار اعتمادك.",
                  )}
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence initial={false}>
              {followUps.map((row, i) => (
                <FollowUpRow
                  key={row.id}
                  row={row}
                  index={i}
                  isRtl={isRtl}
                  t={t}
                  onApprove={(r) => void handleApprove(r)}
                  onEdit={handleEdit}
                  onSkip={(r) => void handleSkip(r)}
                  busy={busyId === row.id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
