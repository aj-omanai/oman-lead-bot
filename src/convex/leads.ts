import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Sample leads so the workspace feels alive before the user runs the Python
 *  pipeline. Real output from `main.py` can be imported through the same shape. */
const SAMPLE_LEADS: Array<{
  name: string;
  phone: string;
  rating: number;
  reviews: number;
  city: string;
  category: string;
  source: string;
  pitch: string;
  status: "new" | "drafted" | "sent";
}> = [
  {
    name: "Al Batinah Marine Services",
    phone: "+968 2470 1234",
    rating: 4.4,
    reviews: 128,
    city: "Muscat, Oman",
    category: "Marine equipment",
    source: "Oman business directory",
    pitch:
      "السلام عليكم، شركتنا متخصصة في حلول التسويق الرقمي للشركات الصناعية في عُمان والخليج. حابين نتعاون معكم ونقدم لكم عرض تسويقي مجاني يناسب نشاطكم. هل فيه وقت مناسب نتكلم فيه؟",
    status: "drafted",
  },
  {
    name: "Dukkan Al Khalij Trading",
    phone: "+968 2329 0876",
    rating: 4.1,
    reviews: 74,
    city: "Salalah, Oman",
    category: "FMCG distribution",
    source: "Oman business directory",
    pitch:
      "مرحبا، لاحظنا إن شركتكم من الشركات الرائدة في التوزيع في ظفار. نقدم لكم حملة تسويقية متكاملة بدون أي تكلفة مبدئية. نتمنى نشارككم التفاصيل في مكالمة قصيرة. شكراً لوقتكم!",
    status: "new",
  },
  {
    name: "Gulf Heights Contracting",
    phone: "+968 2456 3322",
    rating: 4.6,
    reviews: 96,
    city: "Muscat, Oman",
    category: "Construction",
    source: "Oman business directory",
    pitch:
      "السلام عليكم، تخصصنا مساعدة شركات المقاولات في الحصول على مشاريع جديدة عبر التسويق الرقمي. عندنا عرض خاص للشركات في مسقط. ممكن نرسل لكم نبذة مختصرة عن خدماتنا؟",
    status: "new",
  },
  {
    name: "Noor Al Khaleej Logistics",
    phone: "+971 4 339 8877",
    rating: 4.3,
    reviews: 211,
    city: "Dubai, UAE",
    category: "Freight & logistics",
    source: "GCC logistics listings",
    pitch: "",
    status: "new",
  },
  {
    name: "Rimal Trading Est.",
    phone: "+974 4455 6677",
    rating: 4.0,
    reviews: 58,
    city: "Doha, Qatar",
    category: "Building materials",
    source: "Qatar business directory",
    pitch: "",
    status: "new",
  },
  {
    name: "Al Safwa Auto Spare Parts",
    phone: "+966 11 240 1122",
    rating: 4.2,
    reviews: 142,
    city: "Riyadh, KSA",
    category: "Automotive parts",
    source: "Saudi business directory",
    pitch: "",
    status: "new",
  },
  {
    name: "Pearl Island Catering",
    phone: "+965 2244 5566",
    rating: 4.5,
    reviews: 87,
    city: "Kuwait City, Kuwait",
    category: "Catering & events",
    source: "Kuwait business directory",
    pitch: "",
    status: "new",
  },
  {
    name: "Ahlan Interiors",
    phone: "+968 2455 8899",
    rating: 4.7,
    reviews: 163,
    city: "Muscat, Oman",
    category: "Interior fit-out",
    source: "Oman business directory",
    pitch:
      "السلام عليكم، شفنا أعمالكم في التصميم الداخلي واعجبتنا! نقدر نساعدكم توصلون لشرائح أكبر من العملاء في الخليج عبر حملات مستهدفة. حابين نتكلم عن فرصة تعاون؟",
    status: "sent",
  },
  {
    name: "Falcon IT Solutions",
    phone: "+971 4 552 6677",
    rating: 4.4,
    reviews: 105,
    city: "Dubai, UAE",
    category: "IT services",
    source: "GCC IT listings",
    pitch: "",
    status: "new",
  },
  {
    name: "Zaytoun Food Industries",
    phone: "+968 2684 1122",
    rating: 4.3,
    reviews: 66,
    city: "Sohar, Oman",
    category: "Food manufacturing",
    source: "Oman business directory",
    pitch: "",
    status: "drafted",
  },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return;
    for (const lead of SAMPLE_LEADS) {
      await ctx.db.insert("leads", { ...lead, userId });
    }
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: v.union(v.literal("new"), v.literal("drafted"), v.literal("sent")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/** Fetch one lead, but only if it belongs to the signed-in user. */
export const getLead = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return null;
    return lead;
  },
});

/** Save a generated pitch and move the lead to the "drafted" stage. */
export const setPitch = mutation({
  args: { id: v.id("leads"), pitch: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, { pitch: args.pitch, status: "drafted" });
  },
});

/**
 * Import leads from the user's local pipeline (e.g. leads.csv). Dedupes by
 * (name, phone) per user, mirroring storage.save_leads in the Python toolkit.
 */
export const importLeads = mutation({
  args: {
    leads: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        rating: v.optional(v.number()),
        reviews: v.optional(v.number()),
        city: v.optional(v.string()),
        category: v.optional(v.string()),
        source: v.optional(v.string()),
        pitch: v.optional(v.string()),
        status: v.optional(
          v.union(v.literal("new"), v.literal("drafted"), v.literal("sent")),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { inserted: 0 };
    if (args.leads.length > 500) {
      throw new Error("Max 500 leads per import.");
    }

    let inserted = 0;
    for (const row of args.leads) {
      const name = row.name.trim();
      if (name.length < 2) continue;
      const existing = await ctx.db
        .query("leads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("name"), name) && q.eq(q.field("phone"), row.phone))
        .first();
      if (existing) continue;
      await ctx.db.insert("leads", {
        userId,
        name,
        phone: row.phone,
        rating: row.rating ?? 0,
        reviews: row.reviews ?? 0,
        city: row.city ?? "",
        category: row.category ?? "General",
        source: row.source ?? "CSV import",
        pitch: row.pitch,
        status: row.status ?? "new",
      });
      inserted += 1;
    }
    return { inserted };
  },
});
