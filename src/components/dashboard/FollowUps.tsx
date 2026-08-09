import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRtl } from "@/hooks/use-rtl";
import { planAtLeast } from "@/lib/plans";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCheck,
  Clock,
  Loader2,
  Mail,
  MessageSquareText,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import type { TabId } from "@/pages/Dashboard";
import { useState } from "react";
import { toast } from "sonner";

function elapsedLabel(sinceMs: number, t: (en: string, ar: string) => string): string {
  const days = Math.floor((Date.now() - sinceMs) / (24 * 60 * 60 * 1000));
  if (days <= 0) return t("today", "اليوم");
  if (days === 1) return t("1 day ago", "منذ يوم واحد");
  return t(`${days} days ago`, `منذ ${days} أيام`);
}

type FollowUpRow = {
  _id: Id<"followUps">;
  channel: "whatsapp" | "email";
  draftSubject?: string;
  draftBody: string;
  _creationTime: number;
  leadName: string;
};

function FollowUpCard({ row }: { row: FollowUpRow }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(row.draftSubject ?? "");
  const [body, setBody] = useState(row.draftBody);
  const [busy, setBusy] = useState<"send" | "skip" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approveAndSend = useAction(api.followUps.approveAndSend);
  const updateDraft = useMutation(api.followUpsData.updateDraft);
  const skip = useMutation(api.followUpsData.skip);

  const handleSend = async () => {
    setBusy("send");
    setError(null);
    try {
      const result = await approveAndSend({ id: row._id });
      if (result.ok) {
        toast.success(t("Follow-up sent", "تم إرسال المتابعة"), { description: row.leadName });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the follow-up.");
    } finally {
      setBusy(null);
    }
  };

  const handleSkip = async () => {
    setBusy("skip");
    try {
      await skip({ id: row._id });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveEdit = async () => {
    setBusy("save");
    try {
      await updateDraft({
        id: row._id,
        draftSubject: row.channel === "email" ? subject : undefined,
        draftBody: body,
      });
      setEditing(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {row.channel === "whatsapp" ? (
                <MessageSquareText className="size-4" />
              ) : (
                <Mail className="size-4" />
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{row.leadName}</CardTitle>
              <CardDescription className="mt-0.5 flex items-center gap-1.5 text-xs">
                <Clock className="size-3" />
                {t("sent", "أُرسلت")} {elapsedLabel(row._creationTime, t)}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full capitalize">
            {row.channel === "whatsapp" ? "WhatsApp" : t("Email", "بريد")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <div className="space-y-2">
              {row.channel === "email" && (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("Subject", "الموضوع")}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium"
                />
              )}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border border-border/80 bg-muted/40 p-3">
              {row.channel === "email" && row.draftSubject && (
                <p className="text-sm font-semibold">{row.draftSubject}</p>
              )}
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{row.draftBody}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy !== null}>
                  {t("Cancel", "إلغاء")}
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={busy !== null}>
                  {busy === "save" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t("Save", "حفظ")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy !== null} className="gap-1.5 text-muted-foreground">
                  {busy === "skip" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                  {t("Skip", "تخطي")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy !== null} className="gap-1.5">
                  <Pencil className="size-3.5" />
                  {t("Edit", "تعديل")}
                </Button>
                <Button size="sm" onClick={handleSend} disabled={busy !== null} className="gap-1.5">
                  {busy === "send" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
                  {t("Approve & send", "اعتماد وإرسال")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FollowUps({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const usage = useQuery(api.usage.getUsage);
  const pending = useQuery(api.followUpsData.listPending);

  const hasPlan = usage ? planAtLeast(usage.plan, "pro") : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Follow-ups", "المتابعات")}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "When a sent pitch gets no reply in 3 days, a follow-up is auto-drafted here for you to review. Nothing sends without your click.",
            "عندما لا يصل رد على رسالة مُرسلة خلال 3 أيام، تُصاغ متابعة تلقائياً هنا لمراجعتها. لا يُرسل شيء دون موافقتك.",
          )}
        </p>
      </div>

      {!hasPlan && usage !== undefined && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("Follow-up automation is a Pro feature", "أتمتة المتابعات ميزة في خطة Pro")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("Upgrade to have follow-ups drafted for you automatically.", "قم بالترقية ليتم صياغة المتابعات لك تلقائياً.")}
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

      {hasPlan && (
        <>
          {pending === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CheckCheck className="size-5" />
              </div>
              <p className="text-sm font-medium">
                {t("No follow-ups need your review right now.", "لا توجد متابعات بحاجة لمراجعتك حالياً.")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.map((row) => (
                <FollowUpCard key={row._id} row={row} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
