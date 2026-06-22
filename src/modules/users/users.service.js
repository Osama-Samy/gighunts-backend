import { NotFoundError } from "../../lib/errors.js";
import { UsersQueries } from "./users.queries.js";

/**
 * @typedef {import("../../types.js").UserSelect} UserSelect
 * @typedef {import("../../types.js").UserInsert} UserInsert
 */

export const UserService = {
  /**
   * Get current user
   * @param {string} userId - user id
   * @param {string} [context] - error context
   * @returns {Promise<(UserSelect | undefined)>} the user if found, undefined otherwise
   */
  async getUserById(userId, context) {
    const user = await UsersQueries.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", context);
    }
    const hasPassword = await UsersQueries.hasPassword(userId);
    return { ...user, hasPassword };
  },

  /**
   * Update user by id
   * @param {string} userId - user id
   * @param {(Partial<UserInsert>)} userData - user data
   * @param {string} [context] - error context
   * @returns {Promise<(UserSelect | undefined)>} the updated user if found, undefined otherwise
   */
  async updateUserById(userId, userData, context) {
    delete userData.email;

    const user = await UsersQueries.updateUserById(userId, userData);
    if (!user) {
      throw new NotFoundError("User not found", context);
    }
    return user;
  },

  /**
   * Upload avatar
   * @param {string} userId - user id
   * @param {Express.Multer.File} avatar - avatar file
   * @param {string} [context] - error context
   * @returns {Promise<(UserSelect | undefined)>} the updated user if found, undefined otherwise
   */
  async uploadAvatar(userId, avatar, context) {
    const result = await UsersQueries.updateUserById(userId, {
      image: avatar.path,
    });
    if (!result) {
      throw new NotFoundError("User not found", context);
    }
    return result;
  },

  /**
   * Set user inactive
   * @param {string} userId - user id
   * @param {string} [context] - error context
   * @returns {Promise<number>} the number of affected rows
   */
  async setUserInactive(userId, context) {
    const result = await UsersQueries.setUserInactive(userId);
    if (result === 0) {
      throw new NotFoundError("User not found", context);
    }
    return result;
  },

  /**
   * Get all user cvs
   * @param {string} userId - user id
   * @returns {Promise<any[]>} the user cvs
   */
  async getUserCvs(userId) {
    const cvs = await UsersQueries.getUserCvs(userId);
    return cvs;
  },
};
