import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { platforms } from "../../db/schema/platforms.js";

export const PlatformsQueries = {
  async findAll() {
    return db.select().from(platforms).orderBy(asc(platforms.id));
  },

  /**
   * @param {number} id
   */
  async findById(id) {
    const result = await db
      .select()
      .from(platforms)
      .where(eq(platforms.id, id));
    return result[0];
  },

  /**
   * @param {{ description: string, imageUrl?: string, platformUrl?: string, youtubeUrl?: string, videoUrl?: string }} data
   */
  async create(data) {
    const result = await db
      .insert(platforms)
      .values({
        description: data.description,
        imageUrl: data.imageUrl ?? null,
        platformUrl: data.platformUrl ?? null,
        youtubeUrl: data.youtubeUrl ?? null,
        videoUrl: data.videoUrl ?? null,
      })
      .returning();

    return result[0];
  },

  /**
   * @param {number} id
   * @param {{ description?: string, imageUrl?: string, platformUrl?: string, youtubeUrl?: string, videoUrl?: string }} data
   */
  async updateById(id, data) {
    const result = await db
      .update(platforms)
      .set({
        ...(data.description !== undefined
          ? {
              description: data.description,
            }
          : {}),
        ...(data.imageUrl !== undefined
          ? {
              imageUrl: data.imageUrl,
            }
          : {}),
        ...(data.platformUrl !== undefined
          ? {
              platformUrl: data.platformUrl,
            }
          : {}),
        ...(data.youtubeUrl !== undefined
          ? {
              youtubeUrl: data.youtubeUrl,
            }
          : {}),
        ...(data.videoUrl !== undefined
          ? {
              videoUrl: data.videoUrl,
            }
          : {}),
      })
      .where(eq(platforms.id, id))
      .returning();

    return result[0];
  },

  /**
   * @param {number} id
   */
  async deleteById(id) {
    const result = await db.delete(platforms).where(eq(platforms.id, id));
    return result.changes;
  },

  /**
   * @param {number[]} ids
   */
  async findByIds(ids) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({ id: platforms.id })
      .from(platforms)
      .where(inArray(platforms.id, ids));
  },

  /**
   * @param {string} userId
   * @param {number[]} platformIds
   */
  async updateUserPlatformFilters(userId, platformIds) {
    const result = await db
      .update(user)
      .set({ platformFilters: platformIds })
      .where(eq(user.id, userId))
      .returning();

    return result[0];
  },
};
