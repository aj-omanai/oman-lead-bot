"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * Server-side scraping — the replacement for the local Python scraper.
 *
 * Fetches public yellowpages.om category listing pages (the live successor of
 * the defunct yellowpages.com.om), extracts business name / phone / city from
 * each `.card` block, normalizes phones to GCC international format, and
 * upserts everything into the shared `scrapeResults` discovery pool.
 *
 * Runs automatically via the daily cron in crons.ts (no user context), and can
 * be triggered on demand from the Leads tab → Discovery pool dialog.
 */

const CATEGORIES: Array<{ slug: string; name: string }> = [
  { slug: "construction-companies", name: "Construction Companies" },
  { slug: "building-materials", name: "Building Materials" },
  { slug: "electro-mechanical", name: "Electro Mechanical" },
  { slug: "freight-forwarding", name: "Freight Forwarding" },
  { slug: "oilfield-supplies", name: "Oilfield Supplies" },
  { slug: "safety-equipment", name: "Safety Equipment" },
  { slug: "hotels-and-travel", name: "Hotels & Travel" },
  { slug: "restaurants", name: "Restaurants" },
  { slug: "car-hire-and-leasing", name: "Car Hire & Leasing" },
  { slug: "automotive", name: "Automotive" },
  { slug: "pest-control", name: "Pest Control" },
  { slug: "engineering-consultants", name: "Engineering Consultants" },
];

const BASE_URL = "https://www.yellowpages.om";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// GCC country dial codes: Oman, Saudi, UAE, Qatar, Bahrain, Kuwait.
const GCC_CODES = new Set(["968", "966", "971", "974", "973", "965"]);
const DEFAULT_COUNTRY_CODE = "+968";

/** Best-effort international phone — local numbers get +968 prepended. */
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\D/g, "");
  if (!cleaned) return "";
  const rest = cleaned.startsWith("00") ? cleaned.slice(2) : cleaned;
  if (GCC_CODES.has(rest.slice(0, 3))) return `+${rest}`;
  return `${DEFAULT_COUNTRY_CODE}${rest}`;
}

function decodeEntities(text: string): string {
  // Run twice so double-encoded &amp;amp; etc. collapse too.
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

function textOnly(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// GCC countries that can appear as the final address segment on cross-border
// listings (e.g. "Dubai, UAE").
const NON_OMAN_COUNTRIES = new Set([
  "uae",
  "united arab emirates",
  "saudi",
  "saudi arabia",
  "qatar",
  "bahrain",
  "kuwait",
]);

/**
 * The site prints the address as e.g.
 * "Po. Box. 1040, P.c 112 Ruwi, Sultanate of Oman" — pull the city out of the
 * "P.c <number> <City>" fragment, falling back to the last address segment.
 */
function parseCity(mapHtml: string): string {
  const text = textOnly(mapHtml);
  const pc = text.match(/(?:P\.?c\.?|PC)\s*\d+\s*([A-Za-z][A-Za-z .'\-]*)/i);
  if (pc) {
    const city = pc[1]
      .replace(/\s*(?:Sultanate\s+of\s+Oman|Oman)\s*$/i, "")
      .replace(/[.,\s]+$/, "")
      .trim();
    if (city) return `${city}, Oman`;
  }
  const before = text.split("Sultanate of Oman")[0];
  const parts = before
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last.length > 1 && /[A-Za-z]/.test(last)) {
    const clean = last.replace(/[.\s]+$/, "");
    const lower = clean.toLowerCase();
    if (NON_OMAN_COUNTRIES.has(lower)) {
      const cityPart = parts[parts.length - 2];
      if (cityPart && /[A-Za-z]/.test(cityPart)) {
        return `${cityPart.replace(/[.\s]+$/, "")}, ${clean}`;
      }
      return clean;
    }
    return `${clean}, Oman`;
  }
  return "Oman";
}

type ScrapedLead = {
  name: string;
  phone: string;
  rating: number;
  reviews: number;
  city: string;
  category: string;
  sourceUrl: string;
};

/** Parse one `.card` block (see the site's listing markup). */
function parseLead(
  cardHtml: string,
  category: string,
  sourceUrl: string,
): ScrapedLead | null {
  const nameMatch = cardHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
  const name = nameMatch ? textOnly(nameMatch[1]) : "";
  if (name.length < 3) return null;

  const phoneMatch = cardHtml.match(/href="tel:([^"]+)"/i);
  const phone = phoneMatch ? normalizePhone(phoneMatch[1]) : "";

  const mapMatch = cardHtml.match(
    /<p[^>]*>[\s\S]*?icofont-google-map[\s\S]*?<\/p>/i,
  );
  const city = mapMatch ? parseCity(mapMatch[0]) : "Oman";

  // The directory shows no public ratings on listing cards.
  return { name, phone, rating: 0, reviews: 0, city, category, sourceUrl };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-GB,en;q=0.9,ar;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

type ScrapeResult = {
  categoriesScraped: number;
  found: number;
  added: number;
  updated: number;
  errors: Array<{ category: string; error: string }>;
};

export const scrapeYellowpages = action({
  args: { categorySlug: v.optional(v.string()) },
  handler: async (ctx, args): Promise<ScrapeResult> => {
    const targets = args.categorySlug
      ? CATEGORIES.filter((c) => c.slug === args.categorySlug)
      : CATEGORIES;

    const found: ScrapedLead[] = [];
    const errors: Array<{ category: string; error: string }> = [];

    for (const category of targets) {
      const url = `${BASE_URL}/yp/category/${category.slug}`;
      try {
        const html = await fetchHtml(url);
        const blocks = html.split(/<div class="card p-3 mb-3[^"]*">/).slice(1);
        for (const block of blocks) {
          const lead = parseLead(block, category.name, url);
          if (lead) found.push(lead);
        }
      } catch (error) {
        errors.push({
          category: category.name,
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    }

    if (found.length === 0) {
      return { categoriesScraped: targets.length, found: 0, added: 0, updated: 0, errors };
    }

    const result = await ctx.runMutation(api.scrapeStore.addResults, {
      leads: found,
    });

    return {
      categoriesScraped: targets.length,
      found: found.length,
      added: result.added,
      updated: result.updated,
      errors,
    };
  },
});
