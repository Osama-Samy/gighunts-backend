const AI_PROPOSAL_URL = "http://91.99.199.47:8002/api/v1/generate-proposal";
const AI_API_KEY = "1234";

/**
 * @typedef {Object} ProposalRequest
 * @property {string} language - Language code (e.g. "ar", "en")
 * @property {Object} user - User data
 * @property {Object} gig - Gig data
 * @property {Object} cv - CV data
 */

/**
 * @typedef {Object} ProposalResponse
 * @property {string} proposal - The generated proposal text
 * @property {string} language - Language used
 * @property {string} platform - Platform name
 * @property {string} proposal_type - Type of proposal
 * @property {Object} metadata - AI metadata (model, tokens, latency)
 * @property {Object} validation - Validation results
 */

export const ProposalService = {
  /**
   * Generate a proposal by calling the external AI service
   * @param {Object} params
   * @param {string} params.language - Language for the proposal
   * @param {Object} params.user - User data from DB
   * @param {Object} params.gig - Gig data from DB
   * @param {Object} params.cv - CV data from DB
   * @param {string} [params.context] - Error context
   * @returns {Promise<ProposalResponse>}
   */
  async generateProposal({ language, user, gig, cv, context }) {
    const payload = {
      language,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        cvLink: user.cvLink || "",
      },
      gig: {
        id: gig.id,
        title: gig.title,
        description: gig.description || "",
        source: gig.source || "",
        minPrice: gig.minPrice || 0,
        maxPrice: gig.maxPrice || 0,
        priceText: gig.priceText || "",
        currency: gig.currency || "$",
        creationTime: gig.creationTime
          ? new Date(gig.creationTime).toISOString()
          : new Date().toISOString(),
      },
      cv: {
        id: cv.id,
        role: cv.role || "",
        skills:
          typeof cv.skills === "string"
            ? cv.skills
            : Array.isArray(cv.skills)
              ? cv.skills.join(", ")
              : "",
        cvLink: cv.cvLink || "",
        coachFeedback:
          typeof cv.coachFeedback === "string"
            ? cv.coachFeedback
            : Array.isArray(cv.coachFeedback)
              ? cv.coachFeedback.join(". ")
              : cv.coachFeedback
                ? JSON.stringify(cv.coachFeedback)
                : "",
      },
    };

    const response = await fetch(AI_PROPOSAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "No response body");
      const status = response.status;

      if (status === 401) {
        throw new Error("AI service authentication failed");
      }
      if (status === 422) {
        throw new Error(`AI service validation error: ${errorBody}`);
      }
      if (status === 429) {
        throw new Error("AI service rate limit exceeded, please try again later");
      }

      throw new Error(
        `AI service error (${status}): ${errorBody}`,
      );
    }

    const result = await response.json();
    return result;
  },
};
