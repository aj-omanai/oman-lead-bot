import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Shared server-side discovery pool.
 *
 * `scraping.scrapeYellowpages` (a "use node" action, run by the daily cron in
 * crons.ts and triggerable from the Leads tab) upserts scraped yellowpages.om
 * listings here via addResults. Users import rows into their own workspace
 * with importFromPool — deduped against their existing leads by (name, phone),
 * exactly like the CSV import path.
 */

export const addResults = mutation({
  args: {
    leads: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        rating: v.number(),
        reviews: v.number(),
        city: v.string(),
        category: v.string(),
        sourceUrl: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let added = 0;
    let updated = 0;
    const now = Date.now();
    for (const lead of args.leads) {
      if (lead.name.length < 2) continue;
      const existing = await ctx.db
        .query("scrapeResults")
        .filter(
          (q) =>
            q.eq(q.field("name"), lead.name) && q.eq(q.field("phone"), lead.phone),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...lead, scrapedAt: now });
        updated += 1;
      } else {
        await ctx.db.insert("scrapeResults", { ...lead, scrapedAt: now });
        added += 1;
      }
    }
    return { added, updated };
  },
});

/** Newest pool entries, optionally filtered by category. */
export const listPool = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const base = args.category
      ? ctx.db
          .query("scrapeResults")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
      : ctx.db.query("scrapeResults");
    const rows = await base.order("desc").collect();
    return rows.slice(0, args.limit ?? 20);
  },
});

/** Pool totals for the discovery dialog header. */
export const getPoolStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scrapeResults").collect();
    const byCategory = new Map<string, number>();
    let lastScrapedAt: number | null = null;
    for (const row of all) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
      if (lastScrapedAt === null || row.scrapedAt > lastScrapedAt) {
        lastScrapedAt = row.scrapedAt;
      }
    }
    return {
      total: all.length,
      categories: Array.from(byCategory.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      lastScrapedAt,
    };
  },
});

/** Copy pool rows (optionally one category) into the user's leads workspace. */
export const importFromPool = mutation({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { inserted: 0, skipped: 0 };

    const poolRows = await ctx.db.query("scrapeResults").collect();
    let inserted = 0;
    let skipped = 0;
    for (const row of poolRows) {
      if (args.category && row.category !== args.category) continue;
      if (inserted >= 500) break;
      const duplicate = await ctx.db
        .query("leads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter(
          (q) =>
            q.eq(q.field("name"), row.name) && q.eq(q.field("phone"), row.phone),
        )
        .first();
      if (duplicate) {
        skipped += 1;
        continue;
      }
      await ctx.db.insert("leads", {
        userId,
        name: row.name,
        phone: row.phone,
        rating: row.rating,
        reviews: row.reviews,
        city: row.city,
        category: row.category,
        source: "yellowpages.om (auto-scrape)",
        status: "new",
      });
      inserted += 1;
    }
    return { inserted, skipped };
  },
});
