import { db } from "../../src/db/index.js";
import { skills } from "../../src/db/schema/skills.js";

/**
 * Creates a skill.
 * @param {string} name
 * @returns {Promise<import("../../src/types.js").SkillSelect>}
 */
export async function createSkill(name) {
  const [skill] = await db.insert(skills).values({ name }).returning();
  if (!skill) {
    throw new Error("Failed to create skill");
  }
  return skill;
}
