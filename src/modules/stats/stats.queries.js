import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gigs } from "../../db/schema/gigs.js";
import { platforms } from "../../db/schema/platforms.js";
import { userGigs } from "../../db/schema/user-gigs.js";
import { userPlatformRatings } from "../../db/schema/user-platform-ratings.js";
import { USER_GIG_STATUS } from "../gigs/user-gig-status.js";

export const StatsQueries = {
  /**
   * @param {string} userId
   */
  async getUserGigStats(userId) {
    const [row] = await db
      .select({
        total: sql`count(*)`,
        pending: sql`sum(case when ${userGigs.status} = ${USER_GIG_STATUS.PENDING} then 1 else 0 end)`,
        closed: sql`sum(case when ${userGigs.status} = ${USER_GIG_STATUS.CLOSED} then 1 else 0 end)`,
        completed: sql`sum(case when ${userGigs.status} = ${USER_GIG_STATUS.COMPLETED} then 1 else 0 end)`,
      })
      .from(userGigs)
      .where(eq(userGigs.userId, userId));

    return {
      total: Number(row?.total ?? 0),
      pending: Number(row?.pending ?? 0),
      closed: Number(row?.closed ?? 0),
      completed: Number(row?.completed ?? 0),
    };
  },

  /**
   * @param {string} userId
   */
  async getUserPlatformStatusStats(userId) {
    const rows = await db
      .select({
        platformId: platforms.id,
        platformName: platforms.description,
        closed: sql`sum(case when ${userGigs.status} = ${USER_GIG_STATUS.CLOSED} then 1 else 0 end)`,
        completed: sql`sum(case when ${userGigs.status} = ${USER_GIG_STATUS.COMPLETED} then 1 else 0 end)`,
      })
      .from(platforms)
      .leftJoin(gigs, eq(gigs.platformId, platforms.id))
      .leftJoin(
        userGigs,
        and(eq(userGigs.gigId, gigs.id), eq(userGigs.userId, userId)),
      )
      .groupBy(platforms.id, platforms.description);

    return rows.map((row) => ({
      platformId: row.platformId,
      platformName: row.platformName ?? "",
      closed: Number(row.closed ?? 0),
      completed: Number(row.completed ?? 0),
    }));
  },

  /**
   * @param {string} userId
   * @param {{ platformId: number, successRate: number }[]} ratings
   */
  async upsertUserPlatformRatings(userId, ratings) {
    if (ratings.length === 0) {
      return;
    }

    await Promise.all(
      ratings.map((rating) =>
        db
          .insert(userPlatformRatings)
          .values({
            userId,
            platformId: rating.platformId,
            successRate: rating.successRate,
          })
          .onConflictDoUpdate({
            target: [
              userPlatformRatings.userId,
              userPlatformRatings.platformId,
            ],
            set: {
              successRate: rating.successRate,
            },
          }),
      ),
    );
  },
};
