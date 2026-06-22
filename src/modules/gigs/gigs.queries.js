import { and, asc, count, countDistinct, desc, eq, getTableColumns, gte, like, lte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gigSkills } from "../../db/schema/gig-skills.js";
import { gigs } from "../../db/schema/gigs.js";
import { userBookmarks } from "../../db/schema/user-bookmarks.js";
import { userGigs } from "../../db/schema/user-gigs.js";
import { userSkills } from "../../db/schema/user-skills.js";
import { USER_GIG_STATUS } from "./user-gig-status.js";
import { subDays } from "date-fns";

/**
 * @typedef {import("../../types.js").GigSelect} GigSelect
 * @typedef {import("../../types.js").UserGigSelect} UserGigSelect
 * @typedef {import("../../types.js").PlatformSelect} PlatformSelect
 * @typedef {import("../../types.js").SkillSelect} SkillSelect
 */

export const GigsQueries = {
  /**
   * Find all gigs with pagination and search
   * @param {object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} [params.search]
   * @param {string} [params.category]
   * @param {number} [params.type]
   * @param {number} [params.platformId]
   * @param {string} [params.userId]
   * @returns {Promise<{data: (GigSelect & {isBookmarked: unknown})[], total: number}>}
   */
  async findAllPaginated({ page, limit, search, category, type, platformId, userId, minPrice, maxPrice }) {
    const offset = (page - 1) * limit;

    const filters = [];
    if (search) filters.push(like(gigs.title, `%${search}%`));
    if (category) filters.push(eq(gigs.category, category));
    if (type) filters.push(eq(gigs.type, type));
    if (platformId) filters.push(eq(gigs.platformId, platformId));
    if (minPrice !== undefined) filters.push(sql`(${gigs.price} >= ${minPrice} OR ${gigs.maxPrice} >= ${minPrice} OR ${gigs.minPrice} >= ${minPrice})`);
    if (maxPrice !== undefined) filters.push(sql`(${gigs.price} <= ${maxPrice} OR ${gigs.minPrice} <= ${maxPrice} OR ${gigs.maxPrice} <= ${maxPrice})`);

    const where = filters.length > 0 ? and(...filters) : undefined;

    const query = db
      .select({
        ...getTableColumns(gigs),
        isBookmarked: userId
          ? sql`EXISTS(SELECT 1 FROM user_bookmarks WHERE user_bookmarks.gig_id = ${gigs.id} AND user_bookmarks.user_id = ${userId})`.mapWith(
            Boolean,
          )
          : sql`FALSE`.mapWith(Boolean),
      })
      .from(gigs)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(gigs.creationTime));

    const countQuery = db
      .select({ total: sql`count(*)` })
      .from(gigs)
      .where(where);

    const [data, [countResult]] = await Promise.all([query, countQuery]);

    return { data, total: countResult?.total ? Number(countResult?.total) : 0 };
  },

  /**
   * Find recommended gigs based on user skills
   * @param {object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} params.userId
   * @param {string} [params.search]
   * @param {string} [params.category]
   * @param {number} [params.type]
   * @param {number} [params.platformId]
   * @returns {Promise<{data: (GigSelect & {isBookmarked: boolean, matchedSkillsCount: number, matchPercentage: number})[], total: number}>}
   */
  async findRecommendedPaginated({ page, limit, userId, search, category, type, platformId, minPrice, maxPrice }) {
    const offset = (page - 1) * limit;

    // Subquery to get total skills per gig
    const totalSkillsPerGig = db
      .select({
        gigId: gigSkills.gigId,
        totalCount: sql`count(${gigSkills.skillId})`.as("totalCount"),
      })
      .from(gigSkills)
      .groupBy(gigSkills.gigId)
      .as("total_skills");

    const filters = [eq(userSkills.userId, userId), gte(gigs.creationTime, subDays(new Date(), 30))];
    if (search) filters.push(like(gigs.title, `%${search}%`));
    if (category) filters.push(eq(gigs.category, category));
    if (type) filters.push(eq(gigs.type, type));
    if (platformId) filters.push(eq(gigs.platformId, platformId));
    if (minPrice !== undefined) filters.push(sql`(${gigs.price} >= ${minPrice} OR ${gigs.maxPrice} >= ${minPrice} OR ${gigs.minPrice} >= ${minPrice})`);
    if (maxPrice !== undefined) filters.push(sql`(${gigs.price} <= ${maxPrice} OR ${gigs.minPrice} <= ${maxPrice} OR ${gigs.maxPrice} <= ${maxPrice})`);

    const query = db
      .select({
        ...getTableColumns(gigs),
        matchedSkillsCount: count(gigSkills.skillId).mapWith(Number),
        matchPercentage:
          sql`(cast(count(${gigSkills.skillId}) as float) / ${totalSkillsPerGig.totalCount})`.mapWith(
            (value) => Number((Number(value) * 100).toFixed(2)),
          ),
        isBookmarked:
          sql`EXISTS(SELECT 1 FROM user_bookmarks WHERE user_bookmarks.gig_id = ${gigs.id} AND user_bookmarks.user_id = ${userId})`.mapWith(
            Boolean,
          ),
      })
      .from(gigs)
      .innerJoin(gigSkills, eq(gigs.id, gigSkills.gigId))
      .innerJoin(userSkills, eq(gigSkills.skillId, userSkills.skillId))
      .innerJoin(totalSkillsPerGig, eq(gigs.id, totalSkillsPerGig.gigId))
      .where(and(...filters))
      .groupBy(gigs.id)
      .orderBy(
        desc(gigs.creationTime),
        desc(count(gigSkills.skillId)),
        desc(sql`cast(count(${gigSkills.skillId}) as float) / ${totalSkillsPerGig.totalCount}`),
      )
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ total: countDistinct(gigs.id) })
      .from(gigs)
      .innerJoin(gigSkills, eq(gigs.id, gigSkills.gigId))
      .innerJoin(userSkills, eq(gigSkills.skillId, userSkills.skillId))
      .where(and(...filters));

    const [data, [countResult]] = await Promise.all([query, countQuery]);

    return {
      data,
      total: countResult?.total ? Number(countResult?.total) : 0,
    };
  },

  /**
   * Find a gig by its ID with relations.
   * @param {number} id
   * @param {string} userId
   * @returns {Promise<GigSelect & {platform: PlatformSelect | null, gigSkills: {skill: SkillSelect, skillId: number, gigId:number}[], isBookmarked: boolean} | undefined>}
   */
  async findById(id, userId) {
    const result = await db.query.gigs.findFirst({
      where: eq(gigs.id, id),
      with: {
        platform: true,
        gigSkills: {
          with: {
            skill: true,
          },
        },
      },
    });

    if (!result) return undefined;

    let isBookmarked = false;
    if (result && userId) {
      const [bookmark] = await db
        .select()
        .from(userBookmarks)
        .where(and(eq(userBookmarks.gigId, id), eq(userBookmarks.userId, userId)));
      isBookmarked = !!bookmark;
    }

    return { ...result, isBookmarked };
  },

  /**
   * Toggle bookmark
   * @param {string} userId
   * @param {number} gigId
   * @returns {Promise<{bookmarked: boolean}>}
   */
  async toggleBookmark(userId, gigId) {
    const [existing] = await db
      .select()
      .from(userBookmarks)
      .where(and(eq(userBookmarks.gigId, gigId), eq(userBookmarks.userId, userId)));

    if (existing) {
      await db
        .delete(userBookmarks)
        .where(and(eq(userBookmarks.gigId, gigId), eq(userBookmarks.userId, userId)));
      return { bookmarked: false };
    } else {
      await db.insert(userBookmarks).values({ userId, gigId });
      return { bookmarked: true };
    }
  },

  /**
   * Track a gig
   * @param {string} userId
   * @param {number} gigId
   * @returns {Promise<UserGigSelect | undefined>}
   */
  async trackGig(userId, gigId) {
    const [existing] = await db
      .select()
      .from(userGigs)
      .where(and(eq(userGigs.gigId, gigId), eq(userGigs.userId, userId)));

    if (existing) return undefined;

    const [row] = await db
      .insert(userGigs)
      .values({
        userId,
        gigId,
        status: USER_GIG_STATUS.PENDING,
      })
      .returning();
    return row;
  },

  /**
   * Get user tracked gigs
   * @param {string} userId
   * @param {object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {number} [params.status]
   * @returns {Promise<{total: number, data: {gig: GigSelect, status: number, createdAt: Date, updatedAt: Date}[]}>}
   */
  async getUserGigs(userId, { page, limit, status }) {
    const offset = (page - 1) * limit;

    const filters = [eq(userGigs.userId, userId)];
    if (status) filters.push(eq(userGigs.status, status));

    const where = and(...filters);

    const query = db
      .select({
        gig: gigs,
        status: userGigs.status,
        createdAt: userGigs.createdAt,
        updatedAt: userGigs.updatedAt,
      })
      .from(userGigs)
      .innerJoin(gigs, eq(userGigs.gigId, gigs.id))
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(gigs.creationTime));

    const countQuery = db
      .select({ total: sql`count(*)` })
      .from(userGigs)
      .where(where);

    const [data, [countResult]] = await Promise.all([query, countQuery]);

    return { data, total: countResult?.total ? Number(countResult?.total) : 0 };
  },

  /**
   * Update tracked gig status
   * @param {string} userId
   * @param {number} gigId
   * @param {number} status
   * @returns {Promise<UserGigSelect | undefined>}
   */
  async updateUserGigStatus(userId, gigId, status) {
    const [result] = await db
      .update(userGigs)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(userGigs.gigId, gigId), eq(userGigs.userId, userId)))
      .returning();
    return result;
  },

  /**
   * Delete tracked gig (set to CLOSED)
   * @param {string} userId
   * @param {number} gigId
   * @returns {Promise<UserGigSelect | undefined>}
   */
  async closeUserGig(userId, gigId) {
    const [result] = await db
      .update(userGigs)
      .set({ status: USER_GIG_STATUS.CLOSED, updatedAt: new Date() })
      .where(and(eq(userGigs.gigId, gigId), eq(userGigs.userId, userId)))
      .returning();
    return result;
  },

  /**
   * Check if gig exists
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const [row] = await db.select({ id: gigs.id }).from(gigs).where(eq(gigs.id, id));
    return !!row;
  },

  /**
   * Get user bookmarks
   * @param {string} userId
   * @param {object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} [params.search]
   * @param {string} [params.category]
   * @param {number} [params.type]
   * @param {number} [params.platformId]
   * @returns {Promise<{total: number, data: {gig: GigSelect, createdAt: Date}[]}>}
   */
  async getUserBookmarks(userId, { page, limit, search, category, type, platformId, minPrice, maxPrice }) {
    const offset = (page - 1) * limit;

    const filters = [eq(userBookmarks.userId, userId)];
    if (search) filters.push(like(gigs.title, `%${search}%`));
    if (category) filters.push(eq(gigs.category, category));
    if (type) filters.push(eq(gigs.type, type));
    if (platformId) filters.push(eq(gigs.platformId, platformId));
    if (minPrice !== undefined) filters.push(sql`(${gigs.price} >= ${minPrice} OR ${gigs.maxPrice} >= ${minPrice} OR ${gigs.minPrice} >= ${minPrice})`);
    if (maxPrice !== undefined) filters.push(sql`(${gigs.price} <= ${maxPrice} OR ${gigs.minPrice} <= ${maxPrice} OR ${gigs.maxPrice} <= ${maxPrice})`);

    const where = and(...filters);

    const query = db
      .select({
        gig: gigs,
        createdAt: userBookmarks.createdAt,
      })
      .from(userBookmarks)
      .innerJoin(gigs, eq(userBookmarks.gigId, gigs.id))
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(gigs.creationTime));

    const countQuery = db
      .select({ total: sql`count(*)` })
      .from(userBookmarks)
      .innerJoin(gigs, eq(userBookmarks.gigId, gigs.id))
      .where(where);

    const [data, [countResult]] = await Promise.all([query, countQuery]);

    return { data, total: countResult?.total ? Number(countResult?.total) : 0 };
  },
};
