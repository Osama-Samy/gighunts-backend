import { ConflictError, NotFoundError } from "../../lib/errors.js";
// oxlint-disable-next-line no-unused-vars
import { buildPaginatedResponse, PaginatedResponse } from "../../lib/pagination.js";
import { GigsQueries } from "./gigs.queries.js";

/**
 * @typedef {import("../../types.js").GigSelect} GigSelect
 * @typedef {import("../../types.js").UserGigSelect} UserGigSelect
 * @typedef {import("../../types.js").PlatformSelect} PlatformSelect
 * @typedef {import("../../types.js").SkillSelect} SkillSelect
 */

export const GigsService = {
  /**
   * Get all gigs paginated
   * @param {object} query
   * @param {number} query.page
   * @param {number} query.limit
   * @param {string} [query.search]
   * @param {string} [query.category]
   * @param {number} [query.type]
   * @param {number} [query.platformId]
   * @param {string} [query.userId]
   * @param {string} _context
   * @returns {Promise<PaginatedResponse<GigSelect>>}
   */
  async getAllGigs(query, _context) {
    const { data, total } = await GigsQueries.findAllPaginated(query);
    return buildPaginatedResponse(data, total, query.page, query.limit);
  },

  /**
   * Get recommended gigs based on user skills
   * @param {string} userId
   * @param {object} query
   * @param {number} query.page
   * @param {number} query.limit
   * @param {string} [query.search]
   * @param {string} [query.category]
   * @param {number} [query.type]
   * @param {number} [query.platformId]
   * @param {string} _context
   * @returns {Promise<PaginatedResponse<GigSelect & {matchedSkillsCount: number, matchPercentage: number}>>}
   */
  async getRecommendedGigs(userId, query, _context) {
    const { data, total } = await GigsQueries.findRecommendedPaginated({
      ...query,
      userId,
    });
    return buildPaginatedResponse(data, total, query.page, query.limit);
  },

  /**
   * Get single gig details
   * @param {number} id
   * @param {string} userId
   * @param {string} context
   */
  async getGigById(id, userId, context) {
    const gig = await GigsQueries.findById(id, userId);
    if (!gig) {
      throw new NotFoundError("Gig not found", context);
    }
    return gig;
  },

  /**
   * Toggle bookmark
   * @param {string} userId
   * @param {number} gigId
   * @param {string} context
   * @returns {Promise<{bookmarked: boolean}>}
   */
  async toggleBookmark(userId, gigId, context) {
    const exists = await GigsQueries.exists(gigId);
    if (!exists) {
      throw new NotFoundError("Gig not found", context);
    }
    return await GigsQueries.toggleBookmark(userId, gigId);
  },

  /**
   * Track a gig
   * @param {string} userId
   * @param {number} gigId
   * @param {string} context
   * @returns {Promise<UserGigSelect>}
   */
  async trackGig(userId, gigId, context) {
    const exists = await GigsQueries.exists(gigId);
    if (!exists) {
      throw new NotFoundError("Gig not found", context);
    }

    const tracked = await GigsQueries.trackGig(userId, gigId);
    if (!tracked) {
      throw new ConflictError("Gig already tracked", context);
    }

    return tracked;
  },

  /**
   * Get user's tracked gigs
   * @param {string} userId
   * @param {object} query
   * @param {number} query.page
   * @param {number} query.limit
   * @param {number} [query.status]
   * @param {string} _context
   * @returns {Promise<PaginatedResponse<{gig: GigSelect, status: number, createdAt: Date, updatedAt: Date}>>}
   */
  async getUserGigs(userId, query, _context) {
    const { data, total } = await GigsQueries.getUserGigs(userId, query);
    return buildPaginatedResponse(data, total, query.page, query.limit);
  },

  /**
   * Get user's bookmarked gigs
   * @param {string} userId
   * @param {object} query
   * @param {number} query.page
   * @param {number} query.limit
   * @param {string} [query.search]
   * @param {string} [query.category]
   * @param {number} [query.type]
   * @param {number} [query.platformId]
   * @param {string} _context
   * @returns {Promise<PaginatedResponse<{gig: GigSelect, createdAt: Date}>>}
   */
  async getUserBookmarks(userId, query, _context) {
    const { data, total } = await GigsQueries.getUserBookmarks(userId, query);
    return buildPaginatedResponse(data, total, query.page, query.limit);
  },

  /**
   * Modify tracked gig status
   * @param {string} userId
   * @param {number} gigId
   * @param {number} status
   * @param {string} context
   * @returns {Promise<UserGigSelect>}
   */
  async updateUserGigStatus(userId, gigId, status, context) {
    const result = await GigsQueries.updateUserGigStatus(userId, gigId, status);
    if (!result) {
      throw new NotFoundError("Tracked gig not found", context);
    }
    return result;
  },

  /**
   * Remove tracked gig (CLOSE action)
   * @param {string} userId
   * @param {number} gigId
   * @param {string} context
   * @returns {Promise<UserGigSelect>}
   */
  async closeUserGig(userId, gigId, context) {
    const result = await GigsQueries.closeUserGig(userId, gigId);
    if (!result) {
      throw new NotFoundError("Tracked gig not found", context);
    }
    return result;
  },
};
