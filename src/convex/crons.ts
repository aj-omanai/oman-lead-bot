import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

/**
 * Scheduled jobs.
 *
 * Daily at 04:30 UTC the yellowpages.om scraper refreshes the shared
 * discovery pool (scrapeResults). Users pull rows into their own workspace
 * from the Leads tab → Discovery pool dialog.
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

export default crons;
