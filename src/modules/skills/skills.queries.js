import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { skills } from "../../db/schema/skills.js";
import { userSkills } from "../../db/schema/user-skills.js";
import { userCvs } from "../../db/schema/user-cvs.js";
import { user } from "../../db/schema/auth.js";

export const SkillsQueries = {
  /**
   * @param {string} userId
   */
  async countUserSkills(userId) {
    const result = await db
      .select()
      .from(userSkills)
      .where(eq(userSkills.userId, userId));
    return result.length;
  },

  /**
   * @param {string} userId
   */
  async listUserSkills(userId) {
    return db
      .select({
        skillId: skills.id,
        skillName: skills.name,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId));
  },

  /**
   * @param {number} skillId
   */
  async findSkillById(skillId) {
    const result = await db.select().from(skills).where(eq(skills.id, skillId));
    return result[0];
  },

  /**
   * @param {string} name
   */
  async findSkillByName(name) {
    const result = await db.select().from(skills).where(eq(skills.name, name));
    return result[0];
  },

  /**
   * @param {{ name: string }} data
   */
  async createSkill(data) {
    const result = await db.insert(skills).values(data).returning();
    return result[0];
  },

  /**
   * Get all skills
   */
  async getAllSkills() {
    return db
      .select({
        skillId: skills.id,
        skillName: skills.name,
      })
      .from(skills);
  },

  /**
   * @param {string} userId
   * @param {number} skillId
   */
  async findUserSkill(userId, skillId) {
    const result = await db
      .select()
      .from(userSkills)
      .where(
        and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)),
      );
    return result[0];
  },

  /**
   * @param {{ userId: string, skillId: number }} data
   */
  async addUserSkill(data) {
    const result = await db.insert(userSkills).values(data).returning();
    return result[0];
  },

  /**
   * @param {string} userId
   * @param {number} skillId
   */
  async removeUserSkill(userId, skillId) {
    const result = await db
      .delete(userSkills)
      .where(
        and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)),
      );
    return result.changes;
  },

  /**
   * @param {number} skillId
   */
  async removeSkillById(skillId) {
    const result = await db.delete(skills).where(eq(skills.id, skillId));
    return result.changes;
  },

  /**
   * @param {string} userId
   */
  async getUserCvsCount(userId) {
    const result = await db
      .select()
      .from(userCvs)
      .where(eq(userCvs.userId, userId));
    return result.length;
  },

  /**
   * @param {string} userId
   * @param {string} cvId
   */
  async findUserCv(userId, cvId) {
    const result = await db
      .select()
      .from(userCvs)
      .where(and(eq(userCvs.userId, userId), eq(userCvs.id, cvId)));
    return result[0];
  },

  /**
   * @param {{ id: string, userId: string, cvLink: string, fileName?: string, skills?: string, atsScore?: number, role?: string|null }} data
   */
  async insertUserCv(data) {
    const result = await db.insert(userCvs).values(data).returning();
    return result[0];
  },

  /**
   * @param {string} userId
   * @param {string} cvId
   */
  async deleteUserCv(userId, cvId) {
    const result = await db
      .delete(userCvs)
      .where(and(eq(userCvs.userId, userId), eq(userCvs.id, cvId)));
    return result.changes;
  },

  /**
   * @param {string} userId
   * @param {string} cvLink
   */
  async updateUserCvLink(userId, cvLink) {
    const result = await db
      .update(user)
      .set({ cvLink })
      .where(eq(user.id, userId))
      .returning();
    return result[0];
  },
};
