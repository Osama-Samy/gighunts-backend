import Fuse from "fuse.js";
import crypto from "node:crypto";
import {
  ApplicationError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import { AIService } from "../../services/ai.service.js";
import { SkillsQueries } from "./skills.queries.js";

const MAX_USER_SKILLS = 50;

/** @type {{ skillId: number, skillName: string }[] | null} */
let skillsCache = null;
/** @type {Fuse<{ skillId: number, skillName: string }> | null} */
let fuseInstance = null;

export const SkillsService = {
  /**
   * @param {string} userId
   */
  async getUserSkills(userId) {
    return SkillsQueries.listUserSkills(userId);
  },

  /**
   * Search all skills using fuzzy matching
   * @param {string} [query]
   * @param {number} [limit]
   * @param {string} [context]
   */
  async searchAllSkills(query, limit = 10, context) {
    if (!skillsCache) {
      skillsCache = await SkillsQueries.getAllSkills();
      fuseInstance = new Fuse(skillsCache, {
        keys: ["skillName"],
        threshold: 0.3,
      });
    }

    if (!query) {
      return skillsCache.slice(0, limit);
    }

    if (!fuseInstance) {
      throw new ApplicationError(
        500,
        "No Fuse Instance",
        "https://example.com/probs/internal-error",
        "Internal Error",
        context,
      );
    }

    const results = fuseInstance.search(query, { limit });
    return results.map((r) => r.item);
  },

  /**
   * @param {{ skillId?: number, name?: string }} input
   * @param {string} [context]
   */
  async resolveSkill(input, context) {
    const skillName = input.name?.trim();
    /** @type {{ id: number, name: string } | undefined} */
    let skill;

    if (input.skillId !== undefined) {
      skill = await SkillsQueries.findSkillById(input.skillId);
    }

    if (!skill && skillName) {
      skill = await SkillsQueries.findSkillByName(skillName);
      if (!skill) {
        skill = await SkillsQueries.createSkill({ name: skillName });
        // Invalidate cache when new skill is created
        skillsCache = null;
        fuseInstance = null;
      }
    }

    if (!skill) {
      throw new ValidationError(
        "Skill not found by id. Provide a valid skillId or a skill name to create one",
        context,
      );
    }

    return skill;
  },

  /**
   * @param {string} userId
   * @param {{ skillId?: number, name?: string }} input
   * @param {string} [context]
   */
  async addSkillToUser(userId, input, context) {
    const skill = await this.resolveSkill(input, context);

    const existing = await SkillsQueries.findUserSkill(userId, skill.id);
    if (existing) {
      throw new ValidationError("Skill already added for this user", context);
    }

    const skillsCount = await SkillsQueries.countUserSkills(userId);
    if (skillsCount >= MAX_USER_SKILLS) {
      throw new ValidationError(
        `User can have at most ${MAX_USER_SKILLS} skills`,
        context,
      );
    }

    const userSkill = await SkillsQueries.addUserSkill({
      userId,
      skillId: skill.id,
    });

    if (!userSkill) {
      throw new Error("Failed to add skill to user");
    }

    return {
      userId: userSkill.userId,
      skillId: userSkill.skillId,
      skillName: skill.name,
    };
  },

  /**
   * @param {string} userId
   * @param {number} currentSkillId
   * @param {{ skillId?: number, name?: string }} input
   * @param {string} [context]
   */
  async editUserSkill(userId, currentSkillId, input, context) {
    const currentUserSkill = await SkillsQueries.findUserSkill(
      userId,
      currentSkillId,
    );
    if (!currentUserSkill) {
      throw new NotFoundError(
        "Current skill mapping not found for user",
        context,
      );
    }

    const targetSkill = await this.resolveSkill(input, context);
    if (targetSkill.id === currentSkillId) {
      return {
        userId,
        skillId: targetSkill.id,
        skillName: targetSkill.name,
      };
    }

    const existingTarget = await SkillsQueries.findUserSkill(
      userId,
      targetSkill.id,
    );
    if (existingTarget) {
      throw new ValidationError("Skill already added for this user", context);
    }

    await SkillsQueries.addUserSkill({ userId, skillId: targetSkill.id });

    const deleted = await SkillsQueries.removeUserSkill(userId, currentSkillId);
    if (!deleted) {
      throw new NotFoundError(
        "Current skill mapping not found for user",
        context,
      );
    }

    return {
      userId,
      skillId: targetSkill.id,
      skillName: targetSkill.name,
    };
  },

  /**
   * @param {string} userId
   * @param {number} skillId
   * @param {string} [context]
   */
  async deleteUserSkill(userId, skillId, context) {
    const userSkill = await SkillsQueries.findUserSkill(userId, skillId);
    if (!userSkill) {
      throw new NotFoundError("Skill mapping not found for user", context);
    }

    const deleted = await SkillsQueries.removeUserSkill(userId, skillId);
    if (!deleted) {
      throw new NotFoundError("Skill mapping not found for user", context);
    }

    return { success: true };
  },

  /**
   * @param {string} userId
   * @param {Express.Multer.File} file
   * @param {string} [context]
   */
  async importSkillsFromCv(userId, file, context) {
    if (!file?.path) {
      throw new ValidationError("CV file is required", context);
    }

    const currentCvsCount = await SkillsQueries.getUserCvsCount(userId);
    if (currentCvsCount >= 4) {
      throw new ValidationError(
        "Maximum of 4 CVs allowed. Please delete an old one.",
        context,
      );
    }

    const aiResult = await AIService.analyzeCv(file, context);
    const detectedSkills = aiResult.skills;

    const cvId = crypto.randomUUID();
    const cvLink = file.path;

    await SkillsQueries.insertUserCv({
      id: cvId,
      userId,
      cvLink,
      fileName: file.originalname ?? "cv.pdf",
      skills: JSON.stringify(detectedSkills),
      atsScore: aiResult.atsScore,
      coachFeedback: aiResult.rawAnalysis?.coach_feedback ?? null,
      role: aiResult.role,
    });

    await SkillsQueries.updateUserCvLink(userId, cvLink);

    const existingUserSkills = await SkillsQueries.listUserSkills(userId);
    const existingNames = new Set(
      existingUserSkills.map((skill) => skill.skillName.trim().toLowerCase()),
    );

    const addedSkills = [];
    const skippedSkills = [];

    for (const detectedSkill of detectedSkills) {
      if (existingNames.has(detectedSkill.toLowerCase())) {
        skippedSkills.push(detectedSkill);
        continue;
      }

      if (existingNames.size >= MAX_USER_SKILLS) {
        skippedSkills.push(detectedSkill);
        continue;
      }

      const skill = await this.resolveSkill({ name: detectedSkill }, context);
      const existingMapping = await SkillsQueries.findUserSkill(
        userId,
        skill.id,
      );
      if (existingMapping) {
        skippedSkills.push(detectedSkill);
        continue;
      }

      const userSkill = await SkillsQueries.addUserSkill({
        userId,
        skillId: skill.id,
      });
      addedSkills.push({
        skillId: userSkill?.skillId,
        skillName: skill.name,
      });
      existingNames.add(skill.name.trim().toLowerCase());
    }

    return {
      cvId,
      cvLink,
      atsScore: aiResult.atsScore,
      role: aiResult.role,
      aiAnalysis: aiResult.rawAnalysis,
      totalDetected: detectedSkills.length,
      addedCount: addedSkills.length,
      limitReached: existingNames.size >= MAX_USER_SKILLS,
      addedSkills,
      skippedSkills,
    };
  },

  /**
   * @param {string} userId
   * @param {string} cvId
   * @param {string} [context]
   */
  async deleteUserCv(userId, cvId, context) {
    const cv = await SkillsQueries.findUserCv(userId, cvId);
    if (!cv) {
      throw new NotFoundError("CV not found", context);
    }

    const deleted = await SkillsQueries.deleteUserCv(userId, cvId);
    if (!deleted) {
      throw new NotFoundError("CV not found", context);
    }

    return { success: true };
  },
};
