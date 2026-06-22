import { StatsQueries } from "./stats.queries.js";

export const StatsService = {
  /**
   * @param {string} userId
   * @param {string} _context
   */
  async getUserGigStats(userId, _context) {
    const { total, pending, closed, completed } =
      await StatsQueries.getUserGigStats(userId);

    const denominator = completed + closed;
    const successRate =
      denominator === 0
        ? 0
        : Number(((completed / denominator) * 100).toFixed(2));

    return {
      totalGigs: total,
      pending,
      closed,
      completed,
      successRate,
    };
  },

  /**
   * @param {string} userId
   * @param {string} _context
   */
  async getUserPlatformSuccessRates(userId, _context) {
    const platformStats = await StatsQueries.getUserPlatformStatusStats(userId);

    const platformSuccessRates = platformStats.map((platform) => {
      const denominator = platform.completed + platform.closed;
      const successRate =
        denominator === 0
          ? 0
          : Number(((platform.completed / denominator) * 100).toFixed(2));

      return {
        platformId: platform.platformId,
        platformName: platform.platformName,
        successRate,
      };
    });

    await StatsQueries.upsertUserPlatformRatings(userId, platformSuccessRates);

    return platformSuccessRates;
  },
};
