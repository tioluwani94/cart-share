import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due restock reminders",
  { minutes: 15 },
  internal.notifications.sendDueReminders,
  {},
);

export default crons;
