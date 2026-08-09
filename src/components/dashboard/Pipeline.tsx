import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gauge,
  Inbox,
  Pencil,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TabId } from "@/pages/Dashboard";

type Lead = Doc<"leads">;

const STAGES = ["new", "qualified", "negotiating", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<
  Stage,
  { label: string; labelAr: string; headerClass: string; dot: string; bar: string }
> = {
  new: {
    label: "New",
    labelAr: "جديد",
    headerClass: "border-border bg-muted/60",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground/60",
  },
  qualified: {
    label: "Qualified",
    labelAr: "مؤهل",
    headerClass: "border-sky-500/25 bg-sky-500/10",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  negotiating: {
    label: "Negotiating",
    labelAr: "تفاوض",
    headerClass: "border-amber-500/25 bg-amber-500/10",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  won: {
    label: "Won",
    labelAr: "فاز",
    headerClass: "border-emerald-500/25 bg-emerald-500/10",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  lost: {
    label: "Lost",
    labelAr: "خسر",
    headerClass: "border-rose-500/25 bg-rose-500/10",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

/** Same thresholds as scoring.scoreBand (kept local — display concern only). */
function scoreTone(score?: number): { className: string } {
  if (score === undefined) return { className: "bg-muted text-muted-foreground" };
  if (score >= 70)
    return { className: "bg-emerald-500/15 text-emerald-700" };
  if (score >= 40) return { className: "bg-amber-500/15 text-amber-700" };
  return { className: "bg-muted text-muted-foreground" };
}

function DealValueEditor({
  lead,
  editingId,
  draft,
  onStart,
  onDraft,
  onSave,
  onCancel,
}: {
  lead: Lead;
  editingId: Id<"leads"> | null;
  draft: string;
  onStart: (lead: Lead) => void;
  onDraft: (value: string) => void;
  onSave: (lead: Lead) => void;
  onCancel: () => void;
}) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const active = editingId === lead._id;

  if (active) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(lead);
        }}
        className="flex items-center gap-1"
      >
        <Input
          autoFocus
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="h-7 w-24 px-2 text-xs"
        />
        <button
          type="submit"
          aria-label={t("Save value", "حفظ القيمة")}
          className="flex size-6 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-500/10"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={t("Cancel", "إلغاء")}
          onClick={onCancel}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </form>
    );
  }

  if (lead.dealValue) {
    return (
      <button
        type="button"
        onClick={() => onStart(lead)}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        {t("ر.ع.", "OMR")} {lead.dealValue.toLocaleString()}
        <Pencil className="size-3 opacity-60" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onStart(lead)}
      className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      + {t("Set deal value", "حدد قيمة الصفقة")}
    </button>
  );
}

export function Pipeline({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isRtl } = useRtl();
  const t = (en: string, ar: string) => (isRtl ? ar : en);
  const leads = useQuery(api.leads.list);
  const summary = useQuery(api.pipeline.summary);
  const setStage = useMutation(api.pipeline.setStage);
  const setDealValue = useMutation(api.pipeline.setDealValue);

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<Id<"leads"> | null>(null);
  const [draft, setDraft] = useState("");

  const currency = isRtl ? "ر.ع." : "OMR";
  const fmt = (n: number) => `${n.toLocaleString()} ${currency}`;

  const byStage = useMemo(() => {
    const map: Record<Stage, Lead[]> = {
      new: [],
      qualified: [],
      negotiating: [],
      won: [],
      lost: [],
    };
    const q = query.trim().toLowerCase();
    for (const lead of leads ?? []) {
      if (
        q &&
        !lead.name.toLowerCase().includes(q) &&
        !lead.city.toLowerCase().includes(q)
      ) {
        continue;
      }
      map[lead.stage ?? "new"].push(lead);
    }
    return map;
  }, [leads, query]);

  const stageTotal = (stage: Stage) =>
    byStage[stage].reduce((sum, lead) => sum + (lead.dealValue ?? 0), 0);

  const moveTo = (lead: Lead, stage: Stage) => {
    void setStage({ id: lead._id, stage });
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead._id);
    setDraft(lead.dealValue ? String(lead.dealValue) : "");
  };

  const saveValue = async (lead: Lead) => {
    const raw = draft.trim();
    if (raw !== "" && (Number.isNaN(Number(raw)) || Number(raw) < 0)) {
      toast.error(t("Enter a positive number.", "أدخل رقماً موجباً."));
      return;
    }
    try {
      await setDealValue({
        id: lead._id,
        ...(raw ? { dealValue: Number(raw) } : {}),
      });
      setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Could not save value.", "تعذر حفظ القيمة."),
      );
    }
  };

  const totalLeads = leads?.length ?? 0;
  const summaryCards = [
    {
      icon: Target,
      label: t("Open pipeline", "قيمة الصفقات المفتوحة"),
      value: summary ? fmt(summary.openValue) : "…",
      hint: t("new + qualified + negotiating", "جديد + مؤهل + تفاوض"),
    },
    {
      icon: TrendingUp,
      label: t("Weighted forecast", "التوقع المرجّح"),
      value: summary ? fmt(summary.weightedValue) : "…",
      hint: t("value × close probability", "القيمة × احتمال الإغلاق"),
    },
    {
      icon: Trophy,
      label: t("Win rate", "معدل الفوز"),
      value: summary ? `${Math.round(summary.winRate * 100)}%` : "…",
      hint: t("won ÷ closed deals", "الفائز ÷ الصفقات المغلقة"),
    },
    {
      icon: Coins,
      label: t("Won value", "قيمة المكاسب"),
      value: summary ? fmt(summary.wonValue) : "…",
      hint: t("closed won deals", "صفقات فازت وأُغلقت"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("Sales pipeline", "خط المبيعات")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "Track deals through the funnel — qualify leads, set a deal value, and move them to won or lost. Scores and deal values are yours to edit at any time.",
              "تابع الصفقات عبر مسار البيع — أهّل العملاء، حدد قيمة الصفقة، وانقلها إلى فاز أو خسر. يمكنك تعديل الدرجات وقيم الصفقات في أي وقت.",
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search name, city…", "ابحث بالاسم، المدينة…")}
            className="h-9 w-full ps-8 sm:w-64"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Card className="h-full border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <card.icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Kanban board */}
      {leads === undefined ? (
        <div className="grid gap-4 lg:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage} className="space-y-2">
              <div className="h-8 animate-pulse rounded-lg bg-muted/70" />
              <div className="h-32 animate-pulse rounded-xl bg-muted/70" />
            </div>
          ))}
        </div>
      ) : totalLeads === 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="size-5" />
            </div>
            <p className="text-sm font-medium">
              {t("No leads in your pipeline yet", "لا توجد عمليات في خط مبيعاتك بعد")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {t(
                "Import your leads from CSV or the discovery pool, then qualify them here with a deal value.",
                "استورد عملياتك من CSV أو مستودع الاكتشاف، ثم أهّلها هنا بقيمة صفقة.",
              )}
            </p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onNavigate("leads")}>
              <Users className="size-4" />
              {t("Go to Leads", "الانتقال إلى العملاء")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            const cards = byStage[stage];
            const total = stageTotal(stage);
            return (
              <div
                key={stage}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-border/70 bg-muted/30"
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-t-xl border-b px-3 py-2.5",
                    meta.headerClass,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", meta.dot)} />
                    <span className="text-sm font-semibold">
                      {isRtl ? meta.labelAr : meta.label}
                    </span>
                    <span className="rounded-full bg-background/70 px-1.5 text-xs font-medium text-muted-foreground">
                      {cards.length}
                    </span>
                  </div>
                  {total > 0 && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {fmt(total)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 p-2.5">
                  {cards.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      {t("No leads here", "لا عملاء هنا")}
                    </p>
                  ) : (
                    cards.map((lead, i) => {
                      const idx = STAGES.indexOf(stage);
                      const prev = idx > 0 ? STAGES[idx - 1] : undefined;
                      const next = idx < STAGES.length - 1 ? STAGES[idx + 1] : undefined;
                      return (
                        <motion.div
                          key={lead._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
                          className="rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-5">{lead.name}</p>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                                scoreTone(lead.score).className,
                              )}
                              title={(lead.scoreReasons ?? []).join(" · ") || undefined}
                            >
                              {lead.score ?? "—"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {lead.city}
                            {lead.category ? ` · ${lead.category}` : ""}
                          </p>

                          <div className="mt-2">
                            <DealValueEditor
                              lead={lead}
                              editingId={editingId}
                              draft={draft}
                              onStart={startEdit}
                              onDraft={setDraft}
                              onSave={(l) => void saveValue(l)}
                              onCancel={() => setEditingId(null)}
                            />
                          </div>

                          <div className="mt-2 flex items-center gap-1 border-t border-border/60 pt-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!prev}
                              onClick={() => prev && moveTo(lead, prev)}
                              aria-label={t("Move back", "تحريك للخلف")}
                            >
                              <ChevronLeft className="size-4 rtl:-scale-x-100" />
                            </Button>
                            <Select
                              value={stage}
                              onValueChange={(value) => moveTo(lead, value as Stage)}
                            >
                              <SelectTrigger className="h-7 flex-1 text-xs" aria-label={t("Move to stage", "نقل إلى مرحلة")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {isRtl ? STAGE_META[s].labelAr : STAGE_META[s].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!next}
                              onClick={() => next && moveTo(lead, next)}
                              aria-label={t("Move forward", "تحريك للأمام")}
                            >
                              <ChevronRight className="size-4 rtl:-scale-x-100" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Gauge className="size-3.5 text-primary" />
        {t(
          "Setting a deal value on a new lead auto-qualifies it. Stage changes and scores are recorded live.",
          "تحديد قيمة صفقة لعميل جديد يؤهله تلقائياً. تُسجَّل تغييرات المراحل والدرجات مباشرة.",
        )}
      </p>
    </div>
  );
}
