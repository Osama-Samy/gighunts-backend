import { PlatformsQueries } from "./platforms.queries.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";

export const PlatformsService = {
  async listAllPlatforms() {
    return PlatformsQueries.findAll();
  },

  /**
   * @param {{ description: string, imageUrl?: string, platformUrl?: string, youtubeUrl?: string, videoUrl?: string }} input
   */
  async addPlatform(input) {
    return PlatformsQueries.create(input);
  },

  /**
   * @param {number} id
   * @param {{ description?: string, imageUrl?: string, platformUrl?: string, youtubeUrl?: string, videoUrl?: string }} input
   * @param {string} [context]
   */
  async editPlatform(id, input, context) {
    const platform = await PlatformsQueries.findById(id);
    if (!platform) {
      throw new NotFoundError("Platform not found", context);
    }

    const updated = await PlatformsQueries.updateById(id, input);
    if (!updated) {
      throw new NotFoundError("Platform not found", context);
    }

    return updated;
  },

  /**
   * @param {number} id
   * @param {string} [context]
   */
  async deletePlatform(id, context) {
    const platform = await PlatformsQueries.findById(id);
    if (!platform) {
      throw new NotFoundError("Platform not found", context);
    }

    const deleted = await PlatformsQueries.deleteById(id);
    if (!deleted) {
      throw new NotFoundError("Platform not found", context);
    }

    return { success: true };
  },

  /**
   * @param {string} userId
   * @param {number[]} platformIds
   * @param {string} [context]
   */
  async updateCurrentUserPlatformFilters(userId, platformIds, context) {
    const uniquePlatformIds = [...new Set(platformIds)];
    const existingPlatforms =
      await PlatformsQueries.findByIds(uniquePlatformIds);

    if (existingPlatforms.length !== uniquePlatformIds.length) {
      throw new ValidationError(
        "One or more platform IDs are invalid",
        context,
      );
    }

    const updatedUser = await PlatformsQueries.updateUserPlatformFilters(
      userId,
      uniquePlatformIds,
    );

    if (!updatedUser) {
      throw new NotFoundError("User not found", context);
    }

    return { platformFilters: updatedUser.platformFilters };
  },
};
