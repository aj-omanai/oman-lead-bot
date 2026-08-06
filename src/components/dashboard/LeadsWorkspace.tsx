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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Check, Copy, Inbox, MessageSquare, Search, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Lead = Doc<"leads">;
type Status = Lead["status"];

const STATUS_ORDER: Status[] = ["new", "drafted", "sent"];

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  new: { label: "New", className: "border-border bg-muted text-muted-foreground" },
  drafted: {
    label: "Drafted",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  sent: { label: "Sent", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" },
};

function PitchDialog({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false);
  const setStatus = useMutation(api.leads.setStatus);

  const copyPitch = async () => {
    await navigator.clipboard.writeText(lead.pitch ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            {lead.name}
          </DialogTitle>
          <DialogDescription>
            Drafted Gulf Arabic pitch · {lead.city}
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
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No pitch yet — run{" "}
            <span className="font-mono text-foreground">python main.py</span>{" "}
            locally to draft one for this lead.
          </p>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyPitch} disabled={!lead.pitch}>
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy pitch"}
            </Button>
          </div>
          {lead.pitch && lead.status !== "sent" && (
            <Button
              size="sm"
              onClick={() => void setStatus({ id: lead._id, status: "sent" })}
            >
              Mark as sent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadsWorkspace() {
  const leads = useQuery(api.leads.list);
  const seed = useMutation(api.leads.seed);
  const setStatus = useMutation(api.leads.setStatus);
  const seededRef = useRef(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (leads && leads.length === 0 && !seededRef.current) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo data from a real-style Oman &amp; GCC scrape. Cycle statuses, view
          pitches, and track what you've sent.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Collected leads</CardTitle>
            <CardDescription>
              {filtered.length} of {leads?.length ?? 0} shown
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, city, phone…"
                className="h-9 w-full pl-8 sm:w-64"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead, i) => (
                    <motion.tr
                      key={lead._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                      className="group border-b transition-colors hover:bg-accent/40"
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
                            {STATUS_STYLE[lead.status].label}
                          </Badge>
                        </button>
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
            Click a status badge to move it through the pipeline: new → drafted → sent.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
