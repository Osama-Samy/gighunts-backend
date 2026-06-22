import { db } from "../../src/db/index.js";
import { platforms } from "../../src/db/schema/platforms.js";

/**
 * Creates a platform.
 * @param {string} description
 * @returns {Promise<import("../../src/types.js").PlatformSelect>}
 */
export async function createPlatform(description) {
  const [platform] = await db.insert(platforms).values({ description }).returning();
  if (!platform) {
    throw new Error("Failed to create platform");
  }
  return platform;
}
