import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

/**
 * Scheduled jobs.
 *
 * Daily at 04:30 UTC the yellowpages.om scraper refreshes the shared
 * discovery pool (scrapeResults). Users pull rows into their own workspace
 * from the Leads tab → Discovery pool dialog.
 *
 * At 05:00 UTC the follow-up job drafts a polite follow-up for every lead
 * that was pitched 3+ days ago with no reply. Drafts only queue for human
 * review — nothing sends automatically (see followUps.ts).
 */
const crons = cronJobs();

crons.daily(
  "scrape-yellowpages-daily",
  {
    hourUTC: 4,
    minuteUTC: 30,
  },
  api.scraping.scrapeYellowpages,
  {},
);

crons.daily(
  "draft-followups-daily",
  {
    hourUTC: 5,
    minuteUTC: 0,
  },
  api.followUps.draftFollowUps,
  {},
);

export default crons;
