import { db } from "../../src/db/index.js";
import { gigs } from "../../src/db/schema/gigs.js";
import { userBookmarks } from "../../src/db/schema/user-bookmarks.js";
import { userGigs } from "../../src/db/schema/user-gigs.js";
import { USER_GIG_STATUS } from "../../src/modules/gigs/user-gig-status.js";

/**
 * Creates a gig.
 * @param {Partial<import("../../src/types.js").GigInsert>} overrides
 */
export async function createGig(overrides = {}) {
  const [gig] = await db
    .insert(gigs)
    .values({
      title: "Test gig",
      description: "Gig Description",
      price: 100,
      type: 1, // Fixed
      ...overrides,
    })
    .returning();
  if (!gig) {
    throw new Error("Failed to create gig");
  }
  return gig;
}

/**
 * Tracks a gig for a user
 * @param {string} userId
 * @param {number} gigId
 * @param {number} status
 */
export async function trackUserGig(userId, gigId, status = USER_GIG_STATUS.PENDING) {
  const [row] = await db.insert(userGigs).values({ userId, gigId, status }).returning();
  return row;
}

/**
 * Bookmarks a gig for a user
 * @param {string} userId
 * @param {number} gigId
 */
export async function bookmarkUserGig(userId, gigId) {
  const [row] = await db.insert(userBookmarks).values({ userId, gigId }).returning();
  return row;
}
