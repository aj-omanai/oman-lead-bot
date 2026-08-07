import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Real sample leads scraped from yellowpages.om (the live successor of the
 *  now-defunct yellowpages.com.om) — company names, phones and cities are real
 *  directory listings, captured August 2026. Ratings/reviews are 0 because the
 *  directory doesn't expose them. Your own `main.py` output imports through the
 *  same shape via the CSV dialog (see the downloadable leads-sample.csv). */
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
  { name: "WJ Towell & Co LLC", phone: "+96824526001", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "السلام عليكم، مجموعة توول من الشركات العريقة في السوق العُماني منذ 1866. فريقنا متخصص في التسويق الرقمي للشركات التجارية الكبرى في الخليج، وحابين نشارككم عرضاً مخصصاً يناسب حجم أعمالكم. ممكن وقت قصير نتعرف فيه على أولوياتكم؟", status: "drafted" },
  { name: "Al Naba Infrastructure LLC", phone: "+96898085141", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Hajiry Group Of Companies", phone: "+96824866000", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "مرحبا، لاحظنا حضور مجموعة الحجيري القوي في قطاع الإنشاءات. نقدم لكم حملة تسويقية متكاملة لشركات المقاولات بدون أي تكلفة مبدئية. نتمنى نرسل لكم نبذة مختصرة عن خدماتنا؟", status: "drafted" },
  { name: "China State Construction Engineering Corp. (Middle East) LLC", phone: "+971554397052", rating: 0, reviews: 0, city: "Dubai, UAE", category: "Construction Companies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Khalili Group", phone: "+96899376481", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Bahwan Engineering Group", phone: "+96824597510", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Naba Holding LLC", phone: "+96892880931", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Construction Companies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Amiantit Oman Co LLC", phone: "+96824445800", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Intisar Corporation LLC (Building Materials)", phone: "+96824831072", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Muna Noor Manufacturing And Trading LLC", phone: "+96899855642", rating: 0, reviews: 0, city: "Rusayl, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Nasr Marbles", phone: "+96896481010", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Kiyumi Electric & Trading Co LLC", phone: "+96824493284", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "The Middle East Traders LLC", phone: "+96824590694", rating: 0, reviews: 0, city: "Muttrah, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Barka Cement Products Factory", phone: "+96899321803", rating: 0, reviews: 0, city: "Barka, Oman", category: "Building Materials", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Genesis International Investment LLC", phone: "+96899450782", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Greenland Equipments & Machinery Est. (Oman)", phone: "+96895916189", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "GeoMatics Middle East", phone: "+96899346640", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Shaksy Engineering Services LLC", phone: "+96893201534", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Yahya Engineering", phone: "+96891799170", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Maxitech International LLC", phone: "+96824696001", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Amanah International Trading & Services LLC", phone: "+96890679556", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Electro Mechanical", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Khalili Logistics LLC", phone: "+96822035000", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Cargoworld Logistics LLC", phone: "+96894213011", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Asyad Shipping Company S.A.O.G", phone: "+96824400900", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Gulf Agency Company (Oman) LLC", phone: "+96824477800", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "City Shipping And Services", phone: "+96824810820", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Duqm United Logistics LLC", phone: "+96871557883", rating: 0, reviews: 0, city: "Duqm, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "WIN Lines", phone: "+96826643915", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Freight Forwarding", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Special Technical Services LLC", phone: "+96824603480", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Kiyumi Oilfield & Gas Equipment & Industrial Appliances LLC", phone: "+96893211909", rating: 0, reviews: 0, city: "Sohar, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Saih Al Nihaidah Trading & Contracting (SANTCO)", phone: "+96824385095", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Gulf Oilfields & Industrial Supplies LLC", phone: "+96824819168", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Business International Group LLC", phone: "+96896012531", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Muscat Overseas Oilfield Supplies Co LLC", phone: "+96822005691", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Rees Oil & Gas Services LLC", phone: "+96824481448", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Oilfield Supplies", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Applus Velosi LLC", phone: "+96899440539", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Addhia Trading & Contracting LLC (Fire, Security And Gas Division)", phone: "+96824491349", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Toolex Industrial Supplies & Solutions (Thanki Enterprises LLC)", phone: "+96899822968", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Dareen Global LLC", phone: "+96892803889", rating: 0, reviews: 0, city: "Qurum, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "G4S Security Solutions LLC", phone: "+96824684900", rating: 0, reviews: 0, city: "Qurum, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Union Technical Trading & Supply Co", phone: "+96896212342", rating: 0, reviews: 0, city: "Seeb, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "FAHUD Safety & Technical Trading SPC", phone: "+96891796734", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Safety Equipment", source: "yellowpages.om", pitch: "", status: "new" },
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

/** Sources used only by the fictional demo set shipped before the real
 *  yellowpages.om scrape replaced it. */
const LEGACY_DEMO_SOURCES = new Set([
  "Oman business directory",
  "GCC logistics listings",
  "Qatar business directory",
  "Saudi business directory",
  "Kuwait business directory",
  "GCC IT listings",
]);

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const insertSample = async () => {
      for (const lead of SAMPLE_LEADS) {
        await ctx.db.insert("leads", { ...lead, userId });
      }
    };

    // Fresh workspace → seed the real sample.
    if (existing.length === 0) {
      await insertSample();
      return;
    }

    // One-time migration: swap the legacy fictional demo set for the real
    // yellowpages.om scrape. Only fires when EVERY existing lead still has a
    // legacy demo source — anything imported by the user blocks the swap.
    const isLegacyDemo =
      existing.length <= 15 &&
      existing.every((lead) => LEGACY_DEMO_SOURCES.has(lead.source));
    if (isLegacyDemo) {
      for (const lead of existing) {
        await ctx.db.delete(lead._id);
      }
      await insertSample();
    }
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: v.union(v.literal("new"), v.literal("drafted"), v.literal("sent")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    if (lead.optedOut && args.status === "sent") return; // do-not-contact leads can't be marked sent
    const patch: { status: typeof args.status; lastContactedAt?: number } = { status: args.status };
    if (args.status === "sent") patch.lastContactedAt = Date.now();
    await ctx.db.patch(args.id, patch);
  },
});

/** Toggle a lead's do-not-contact flag. Opted-out leads can't be drafted for
 *  or marked sent, on either the WhatsApp or email channel. */
export const toggleOptOut = mutation({
  args: { id: v.id("leads"), optedOut: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, { optedOut: args.optedOut });
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
    if (!lead || lead.userId !== userId || lead.optedOut) return;
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
        email: v.optional(v.string()),
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
        email: row.email,
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

/** Internal-only: called by emailOutreach.sendEmail after a successful send.
 *  Status is channel-agnostic — it reflects "contacted," not "contacted on
 *  WhatsApp specifically." */
export const markEmailSent = internalMutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "sent", lastContactedAt: Date.now() });
  },
});
