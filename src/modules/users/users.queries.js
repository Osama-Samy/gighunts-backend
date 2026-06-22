import { eq, sql, and, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { user, account } from "../../db/schema/auth.js";
import { userCvs } from "../../db/schema/user-cvs.js";

/**
 * @typedef {import("../../types.js").UserSelect} UserSelect
 * @typedef {import("../../types.js").UserInsert} UserInsert
 */

export const UsersQueries = {
  /**
   * Find user by id
   * @param {string} id - user id
   * @returns {Promise<(UserSelect | undefined)>} the user if found, undefined otherwise
   */
  async findById(id) {
    const result = await db.select().from(user).where(eq(user.id, id));
    return result[0];
  },

  /**
   * Check if user has a password set
   * @param {string} id - user id
   * @returns {Promise<boolean>} true if the user has a password set, false otherwise
   */
  async hasPassword(id) {
    const [result] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, id), isNotNull(account.password)))
      .limit(1);
    return !!result;
  },

  /**
   * Find user by email
   * @param {string} email - user email
   * @returns {Promise<(UserSelect | undefined)>} the user if found, undefined otherwise
   */
  async findByEmail(email) {
    const result = await db
      .select()
      .from(user)
      .where(sql`lower(${user.email}) = lower(${email})`);
    return result[0];
  },

  /**
   * Update user by id
   * @param {string} id - user id
   * @param {Partial<UserInsert>} data - user data
   * @returns {Promise<(UserSelect | undefined)>} the updated user if found, undefined otherwise
   */
  async updateUserById(id, data) {
    const result = await db
      .update(user)
      .set(data)
      .where(eq(user.id, id))
      .returning();
    return result[0];
  },

  /**
   * Update user email fields by id
   * @param {string} id - user id
   * @param {{ email: string, emailVerified: boolean }} data - email fields
   * @returns {Promise<(UserSelect | undefined)>} the updated user if found, undefined otherwise
   */
  async updateUserEmailById(id, data) {
    const result = await db
      .update(user)
      .set(data)
      .where(eq(user.id, id))
      .returning();
    return result[0];
  },

  /**
   * Set user inactive
   * @param {string} id - user id
   * @returns {Promise<number>} the number of affected rows
   */
  async setUserInactive(id) {
    const result = await db
      .update(user)
      .set({ isActive: false })
      .where(eq(user.id, id));
    return result.changes;
  },

  /**
   * Get all user cvs
   * @param {string} userId - user id
   * @returns {Promise<any[]>} the user cvs
   */
  async getUserCvs(userId) {
    const result = await db
      .select()
      .from(userCvs)
      .where(eq(userCvs.userId, userId));
    return result;
  },
};
