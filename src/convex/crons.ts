import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Follow-up automation: once a day, draft a follow-up for every lead whose
// sent pitch got no reply in 3 days. See followUps.generateDue and
// docs/superpowers/specs/2026-08-08-follow-up-automation-design.md.
crons.daily(
  "draft due follow-ups",
  { hourUTC: 6, minuteUTC: 0 },
  internal.followUps.generateDue,
);

export default crons;
