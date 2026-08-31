import "dotenv/config";
import { schedule } from "node-cron";
import { lte } from "drizzle-orm";
import { db } from "./db/index.js";
import { logs } from "./db/schema/logs.js";
import { runScraperJob } from "./lib/scraper.js";

console.log("[Worker] Background worker started.");

// Setup Scheduled Task (cron) to flush old logs every 10 days
schedule("0 0 */10 * *", async () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  try {
    console.log("[Worker] Flushing old logs...");
    await db.delete(logs).where(lte(logs.createdAt, tenDaysAgo)).execute();
    console.log("[Worker] Successfully flushed old logs.");
  } catch (e) {
    console.error("[Worker] Error flushing old logs:", e);
  }
});

// Setup Scheduled Task (cron) to scrape gigs every 6 hours
schedule("0 */6 * * *", () => {
  console.log("[Worker] Starting scheduled scraper job...");
  runScraperJob().catch(console.error);
});

// Run scraper immediately on boot (optional, but usually helpful)
runScraperJob().catch((err) => {
  console.error("[Worker] Initial scraper run failed:", err);
});
