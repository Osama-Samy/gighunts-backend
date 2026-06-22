import { inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { gigSkills } from "../db/schema/gig-skills.js";
import { gigs } from "../db/schema/gigs.js";
import { platforms } from "../db/schema/platforms.js";
import { skills } from "../db/schema/skills.js";

/**
 * Utility to chunk arrays
 * @template T
 * @param {T[]} array
 * @param {number} size
 * @returns {T[][]}
 */
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Parse a price string into { minPrice, maxPrice, currency }
 * Example: "$500-$1k" -> { min: 500, max: 1000, currency: "$" }
 * @param {string | undefined} priceRaw
 */
function parsePriceData(priceRaw) {
  if (!priceRaw || priceRaw === "N/A") {
    return { minPrice: null, maxPrice: null, currency: null };
  }

  // Extract all numbers (handling k suffix for thousands)
  const bounds = Array.from(priceRaw.matchAll(/(\d+(?:\.\d+)?)\s*([kK])?/g)).map((m) => {
    let val = Number(m[1]);
    if (m[2]) val *= 1000;
    return val;
  });

  // Extract currency code or symbol (heuristics)
  const currencyMatch = priceRaw.match(/([A-Z]{3})/) || priceRaw.match(/([$€£¥])/);
  const currency = currencyMatch ? currencyMatch[1] : null;

  let minPrice = null;
  let maxPrice = null;
  if (bounds.length > 0) {
    minPrice = bounds[0];
    if (bounds.length > 1) {
      maxPrice = bounds[1];
    } else {
      maxPrice = bounds[0];
    }
  }

  return { minPrice, maxPrice, currency };
}

/**
 * Executes the scraping process
 */
export async function runScraperJob() {
  const baseUrl = process.env["SCRAPER_URL"];
  if (!baseUrl) {
    console.log("[Scraper] No SCRAPER_URL configured. Skipping job.");
    return;
  }

  const url = `${baseUrl}/jobs/new`;
  console.log(`[Scraper] Starting scraper job. Fetching from ${url}`);
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
  } catch (error) {
    console.error("[Scraper] Scraper job failed:", error);
  }
}

/**
 * Processes and inserts gigs data array into the database.
 * @param {any[]} data
 */
export async function processGigsData(data) {
  try {
    console.log(`[Scraper] Processing ${data.length} gigs. Starting ingestion...`);

    // Fetch platforms to map source name to platformId
    const allPlatforms = await db
      .select({ id: platforms.id, description: platforms.description })
      .from(platforms);
    const platformNameToId = new Map(
      allPlatforms.map((p) => [p.description?.toLowerCase().trim(), p.id]),
    );

    // 1. Collect all unique skills
    /** @type {Set<string>} */
    const uniqueSkills = new Set();
    for (const item of data) {
      if (Array.isArray(item.skills)) {
        item.skills.forEach((/** @type {string} */ s) => uniqueSkills.add(s.toLowerCase().trim()));
      }
    }

    const skillArray = Array.from(uniqueSkills)
      .filter(Boolean)
      .map((s) => ({ name: s }));

    // 2. Batch insert skills
    const SKILL_BATCH_SIZE = 500;
    const skillChunks = chunkArray(skillArray, SKILL_BATCH_SIZE);

    console.log(
      `[Scraper] Syncing ${skillArray.length} unique skills in ${skillChunks.length} chunks...`,
    );
    for (const chunk of skillChunks) {
      await db.insert(skills).values(chunk).onConflictDoNothing();
    }

    // After insert, fetch mapping of skill name -> id
    const allSkills = await db.select({ id: skills.id, name: skills.name }).from(skills);
    const skillNameToId = new Map(allSkills.map((s) => [s.name, s.id]));

    // 3. Prepare gigs and batch process
    const GIG_BATCH_SIZE = 200;
    const gigChunks = chunkArray(data, GIG_BATCH_SIZE);

    console.log(`[Scraper] Syncing Gigs in ${gigChunks.length} chunks...`);

    let totalGigsProcessed = 0;

    for (const chunk of gigChunks) {
      const gigValuesToInsert = chunk.map((item) => {
        const { minPrice, maxPrice, currency } = parsePriceData(item.price);

        return {
          title: item.title,
          url: item.url,
          description: item.description,
          priceText: item.price,
          minPrice,
          maxPrice,
          currency,
          duration: item.duration,
          category: item.category,
          language: item.language,
          source: item.source,
          platformId: platformNameToId.get(item.source?.toLowerCase().trim()) || null,
          key: item.key,
          creationTime: item.time ? new Date(item.time) : new Date(),
        };
      });

      // Insert gigs ignoring duplicates based on URL
      await db.insert(gigs).values(gigValuesToInsert).onConflictDoNothing({ target: gigs.url });

      // In sqlite, we can't reliably return inserted IDs if we ignored them via onConflictDoNothing.
      // So we fetch the IDs using the URLs.
      const chunkUrls = gigValuesToInsert.map((g) => g.url);
      const insertedGigs = await db
        .select({ id: gigs.id, url: gigs.url })
        .from(gigs)
        .where(inArray(gigs.url, chunkUrls));

      const urlToGigId = new Map(insertedGigs.map((g) => [g.url, g.id]));

      // 4. Prepare gig_skills relationships
      const gigSkillsToInsert = [];
      for (const item of chunk) {
        const gigId = urlToGigId.get(item.url);
        if (!gigId || !Array.isArray(item.skills)) continue;

        for (const skillName of item.skills) {
          const sName = skillName.toLowerCase().trim();
          const skillId = skillNameToId.get(sName);
          if (skillId) {
            gigSkillsToInsert.push({ gigId, skillId });
          }
        }
      }

      // De-duplicate pairs just in case
      const uniqueGigSkills = [];
      const seenPairs = new Set();
      for (const gs of gigSkillsToInsert) {
        const key = `${gs.gigId}-${gs.skillId}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          uniqueGigSkills.push(gs);
        }
      }

      if (uniqueGigSkills.length > 0) {
        // SQLite batch param limit is 999. Since gigSkills is 2 columns, max chunk is ~450.
        const gsChunks = chunkArray(uniqueGigSkills, 400);
        for (const gsChunk of gsChunks) {
          await db.insert(gigSkills).values(gsChunk).onConflictDoNothing();
        }
      }

      totalGigsProcessed += chunk.length;
    }

    console.log(`[Scraper] Processing complete. Processed ${totalGigsProcessed} gigs.`);
  } catch (error) {
    console.error("[Scraper] Scraper job failed:", error);
  }
}
