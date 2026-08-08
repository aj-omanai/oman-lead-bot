import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Real sample leads scraped from yellowpages.om (the live successor of the
 *  now-defunct yellowpages.com.om) — company names, phones and cities are real
 *  directory listings, captured August 2026 across 12 categories. Ratings and
 *  reviews are 0 because the directory doesn't expose them. Your own main.py
 *  output imports through the same shape via the CSV dialog (see the
 *  downloadable leads-sample.csv in the Script Library). */
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
  { name: "Shangri La Barr Al Jissah", phone: "+96824776666", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Alila Jabal Akhdar", phone: "+96825344200", rating: 0, reviews: 0, city: "Al Jabal Al Akhdar, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Sohar Beach Hotel", phone: "+96826841111", rating: 0, reviews: 0, city: "Sohar, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Desert Nights Camp", phone: "+96892818388", rating: 0, reviews: 0, city: "Al Wasil, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Wadi Hotel - Sohar", phone: "+96826840058", rating: 0, reviews: 0, city: "Sohar, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "City Seasons Muscat", phone: "+96824394800", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Hotels & Travel", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "RazmAzaan Restaurant", phone: "+96891944999", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Kamat Restaurant", phone: "+96824793355", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "#968 The Food Studio", phone: "+96890968968", rating: 0, reviews: 0, city: "Al Khuwair, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Aangan By Rohit Ghai", phone: "+96879269247", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "AL Andalus Restaurant", phone: "+96822550000", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Aqr Traditional Restaurant", phone: "+96872237373", rating: 0, reviews: 0, city: "Nizwa, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Baha Restaurant", phone: "+96825218000", rating: 0, reviews: 0, city: "Nizwa, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Falaj The Restaurant", phone: "+96894303207", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Khana Khazana Restaurant", phone: "+96899107745", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Bombay Chaat Corner & Restaurant", phone: "+96899368514", rating: 0, reviews: 0, city: "Wadi Kabir, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Golden Moon Restaurant Ghala", phone: "+96893514008", rating: 0, reviews: 0, city: "Ghala, Oman", category: "Restaurants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Global Car Rental & Leasing (Al Hashar Group)", phone: "+96895032958", rating: 0, reviews: 0, city: "Qurum, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Budget Rent A Car (Travel & Allied Services LLC)", phone: "+96822351860", rating: 0, reviews: 0, city: "Al Khuwair, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Autorent Oman", phone: "+96879999466", rating: 0, reviews: 0, city: "Azaiba, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Orbit Car Rental & Leasing", phone: "+96872727696", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "MHD - ACERE - MHD Leasing LLC", phone: "+96871557334", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Dollar Car Rental", phone: "+96824590824", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Sixt Rent A Car", phone: "+96822080940", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Europcar Oman", phone: "+96897867424", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "International Rent A Car", phone: "+96897090063", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "ABC Rent A Car", phone: "+96892804099", rating: 0, reviews: 0, city: "Ghala, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Sayarti Car Rentals", phone: "+96899684331", rating: 0, reviews: 0, city: "Azaiba, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Avis Oman", phone: "+96824607235", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Al Moosa Rent A Car", phone: "+96893266064", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Car Hire & Leasing", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "TMTEC Trading & Technical Services LLC", phone: "+96824595838", rating: 0, reviews: 0, city: "Muttrah, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Techno Gears Industries LLC", phone: "+96824446782", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Gulf Services & Industrial Supplies Co LLC", phone: "+96893214159", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Precision Tune Auto Care", phone: "+96824479986", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Oman Mechanical Services Co Ltd LLC (Lubricant Division)", phone: "+96824502820", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Oman Mechanical Services Co Ltd LLC(Material Handling Division)", phone: "+96824592235", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "MHD - ACERE - Automotive Division", phone: "+96824496560", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "MHD - ACERE - Tyres & Batteries Division", phone: "+96871557334", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Automotive", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "AL Ariq Equipment LLC", phone: "+96824502925", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Pest Control", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Peace Of Mind LLC", phone: "+96892487777", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Pest Control", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Luster Overall Excellence Foundation", phone: "+96893572480", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Pest Control", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "National Pest Control Services LLC", phone: "+96890116213", rating: 0, reviews: 0, city: "Al Amerat, Oman", category: "Pest Control", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "ART Group Of Companies", phone: "+96898702485", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Pest Control", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Towell Engineering Group", phone: "+96824526084", rating: 0, reviews: 0, city: "Ruwi, Oman", category: "Engineering Consultants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Miles Engineering Consultancy", phone: "+96897221599", rating: 0, reviews: 0, city: "Seeb, Oman", category: "Engineering Consultants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "National Engineering Office", phone: "+96822507668", rating: 0, reviews: 0, city: "Muscat, Oman", category: "Engineering Consultants", source: "yellowpages.om", pitch: "", status: "new" },
  { name: "Dawood Engineering Consultancy", phone: "+96824499466", rating: 0, reviews: 0, city: "Azaiba, Oman", category: "Engineering Consultants", source: "yellowpages.om", pitch: "", status: "new" },
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

/** Categories that exist only in the expanded 89-lead sample — their absence
 *  is how seed() recognises a workspace still on the previous 42-lead sample. */
const EXPANDED_SAMPLE_CATEGORIES = [
  "Restaurants",
  "Hotels & Travel",
  "Automotive",
  "Pest Control",
  "Engineering Consultants",
];

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

    // One-time migration #1: swap the legacy fictional demo set for the real
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
      return;
    }

    // One-time migration #2: swap the previous 42-lead sample for the expanded
    // 89-lead sample. Only fires when the workspace looks exactly like the old
    // sample — all yellowpages.om-sourced, ≤45 leads, and no lead in a category
    // that only the expanded sample covers.
    const isPrevSample =
      existing.length <= 45 &&
      existing.every((lead) => lead.source === "yellowpages.om") &&
      !existing.some((lead) =>
        EXPANDED_SAMPLE_CATEGORIES.includes(lead.category),
      );
    if (isPrevSample) {
      for (const lead of existing) {
        await ctx.db.delete(lead._id);
      }
      await insertSample();
    }
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("leads"),
    status: v.union(v.literal("new"), v.literal("drafted"), v.literal("sent")),
    // Channel that was used to contact the lead (whatsapp / email) — recorded
    // so the follow-up cron knows which channel to reuse.
    channel: v.optional(v.union(v.literal("whatsapp"), v.literal("email"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    // Record when the lead was last contacted whenever it moves to "sent".
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "sent" ? { lastContactedAt: Date.now() } : {}),
      ...(args.status === "sent" && args.channel
        ? { lastContactChannel: args.channel }
        : {}),
    });
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
    if (lead.optedOut) {
      throw new Error("This lead opted out — do-not-contact is on.");
    }
    await ctx.db.patch(args.id, { pitch: args.pitch, status: "drafted" });
  },
});

/** Do-not-contact toggle — blocks AI drafting and sending on both channels. */
export const setOptOut = mutation({
  args: { id: v.id("leads"), optedOut: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, { optedOut: args.optedOut });
  },
});

/** Add or update a lead's email address (used by Email Outreach). */
export const setEmail = mutation({
  args: { id: v.id("leads"), email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, { email: args.email.trim() || undefined });
  },
});

/** Save an AI-drafted email subject + body onto the lead. */
export const setEmailDraft = mutation({
  args: {
    id: v.id("leads"),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    if (lead.optedOut) {
      throw new Error("This lead opted out — do-not-contact is on.");
    }
    await ctx.db.patch(args.id, {
      emailSubject: args.emailSubject ?? undefined,
      emailBody: args.emailBody ?? undefined,
      status: "drafted",
    });
  },
});

/** Free-form notes on a lead (e.g. why they opted out). */
export const updateNotes = mutation({
  args: { id: v.id("leads"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, { notes: args.notes?.trim() || undefined });
  },
});

export const setEmailVerified = mutation({
  args: {
    id: v.id("leads"),
    emailVerified: v.optional(v.string()),
    emailVerifiedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, {
      emailVerified: args.emailVerified || undefined,
      emailVerifiedAt: args.emailVerifiedAt ?? Date.now(),
    });
  },
});

export const setWhatsappResult = mutation({
  args: {
    id: v.id("leads"),
    whatsappStatus: v.optional(
      v.union(
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("failed"),
      ),
    ),
    whatsappMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, {
      whatsappStatus: args.whatsappStatus ?? undefined,
      whatsappMessageId: args.whatsappMessageId ?? undefined,
      ...(args.whatsappStatus === "sent" || args.whatsappStatus === "delivered"
        ? {
            lastContactedAt: Date.now(),
            lastContactChannel: "whatsapp" as const,
            status: "sent" as const,
          }
        : {}),
    });
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
        email: v.optional(v.string()),
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
        email: row.email?.trim() || undefined,
        pitch: row.pitch,
        status: row.status ?? "new",
      });
      inserted += 1;
    }
    return { inserted };
  },
});
