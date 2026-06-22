import { readFile } from "node:fs/promises";
import { env } from "../lib/env.js";
import { ApplicationError, ValidationError } from "../lib/errors.js";

export const AIService = {
  /**
   * @param {Express.Multer.File} file
   * @param {string} [context]
   * @returns {Promise<{ skills: string[], atsScore: number, role: string|null, rawAnalysis: any }>}
   */
  async analyzeCv(file, context) {
    if (!file?.path) {
      throw new ValidationError("CV file is required", context);
    }

    try {
      const fileBuffer = await readFile(file.path);
      const formData = new FormData();
      const blob = new Blob([fileBuffer], {
        type: file.mimetype || "application/pdf",
      });
      formData.append("file", blob, file.originalname || "cv.pdf");

      const response = await fetch(env.AI_CV_ANALYZE_URL, {
        method: "POST",
        body: formData,
      });

      const analysisResult = /** @type {any} */ (await response.json());
      console.log("res", analysisResult);

      if (!response.ok) {
        throw new ApplicationError(
          502,
          `CV analysis service failed with status ${response.status}`,
          "https://example.com/probs/upstream-service-error",
          "Bad Gateway",
          context,
        );
      }

      const skillsFromModel = analysisResult?.candidate_profile?.skills;
      if (!Array.isArray(skillsFromModel)) {
        throw new ApplicationError(
          502,
          "Invalid response from CV analysis service",
          "https://example.com/probs/upstream-service-error",
          "Bad Gateway",
          context,
        );
      }

      const detectedSkills = [
        ...new Set(
          skillsFromModel.map((skill) => String(skill).trim()).filter(Boolean),
        ),
      ];

      const atsScore = analysisResult?.ats_analysis?.score ?? 0;
      const role = analysisResult?.candidate_profile?.role ?? null;

      return {
        skills: detectedSkills,
        atsScore: Number(atsScore) || 0,
        role: role,
        rawAnalysis: analysisResult,
      };
    } catch (e) {
      console.log("error", e);

      if (e instanceof ApplicationError || e instanceof ValidationError) {
        throw e;
      }
      throw new ApplicationError(
        500,
        "Failed to analyze CV",
        "https://example.com/probs/internal-error",
        "Internal Error",
        context,
      );
    }
  },
};
