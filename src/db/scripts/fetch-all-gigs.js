import { processGigsData } from "../../lib/scraper.js";
import { env } from "../../lib/env.js";

async function run() {
  const baseUrl = env.SCRAPER_URL;
  if (!baseUrl) {
    console.error("[Scraper] No SCRAPER_URL configured. Please check your .env file.");
    process.exit(1);
  }

  const url = `${baseUrl}/jobs/all`;
  console.log(`[Scraper] Fetching all available gigs from ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch scraper data: ${response.statusText}`);
    }

    /** @type any */
    const json = await response.json();
    const data = json.jobs;
    
    if (!Array.isArray(data)) {
      throw new Error(`Expected 'jobs' to be an array but got ${typeof data}`);
    }

    console.log(`[Scraper] Retrieved ${data.length} gigs. Starting processing...`);
    await processGigsData(data);
    console.log("[Scraper] Successfully processed all gigs.");
    process.exit(0);
  } catch (error) {
    console.error("[Scraper] Fetch all gigs failed:", error);
    process.exit(1);
  }
}

run();
