import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import z from "zod";
import { userInsertSchema, userSelectSchema } from "../../db/schema/auth.js";
import { userCvsSelectSchema } from "../../db/schema/user-cvs.js";
import { BaseResponse, baseResponseSchema } from "../../lib/baseResponse.js";
import { ApplicationError, UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { createRoute } from "../../lib/routeCreator.js";
import { EmailChangeService } from "./email-change.service.js";
import { PasswordResetService } from "./password-reset.service.js";
import { UserService } from "./users.service.js";
import { auth } from "../../lib/auth.js";
import { GigsQueries } from "../gigs/gigs.queries.js";
import { ProposalService } from "../../services/proposal.service.js";

export const usersRouter = Router();
export const basePath = "/users";

const forgotPasswordRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    message:
      "Too many password reset requests for this email. Please try again in 24 hours.",
  },
});

const forgotPasswordBodySchema = z.object({
  email: z.email(),
});

const resetPasswordBodySchema = z.object({
  email: z.email(),
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
});

const verifyOtpBodySchema = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const requestEmailChangeOtpBodySchema = z.object({
  newEmail: z.email(),
});

const confirmEmailChangeBodySchema = z.object({
  newEmail: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

/**
 * @param {import("express").Request} req
 */
function keyGenerator(req) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const fallbackIp = String(req.ip ?? "127.0.0.1");
  return email || ipKeyGenerator(fallbackIp);
}

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/password/forgot",
  middleware: [forgotPasswordRateLimit],
  bodySchema: forgotPasswordBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      message: z.string(),
    }),
  }),
  openapi: {
    summary: "Request password reset OTP",
    tags: ["User"],
    operationId: "requestPasswordResetOtp",
    description:
      "Sends a 6-digit OTP to the user's email. The OTP expires in 5 minutes.",
  },
  handler: async ({ req, body }) => {
    const result = await PasswordResetService.requestOtp(
      body.email,
      req.originalUrl,
    );
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/password/verify",
  bodySchema: verifyOtpBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      message: z.string(),
      resetToken: z.string(),
    }),
  }),
  openapi: {
    summary: "Verify password reset OTP",
    tags: ["User"],
    operationId: "verifyPasswordResetOtp",
    description:
      "Verifies the 6-digit OTP and returns a short-lived reset token for the final password reset step.",
  },
  handler: async ({ req, body }) => {
    const result = await PasswordResetService.verifyOtp(
      body.email,
      body.otp,
      req.originalUrl,
    );
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/password/reset",
  bodySchema: resetPasswordBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      message: z.string(),
    }),
  }),
  openapi: {
    summary: "Reset password with token",
    tags: ["User"],
    operationId: "resetPasswordWithToken",
    description:
      "Resets the user's password after OTP verification using the reset token returned by the verification step.",
  },
  handler: async ({ req, body }) => {
    const result = await PasswordResetService.resetPassword(
      body.email,
      body.resetToken,
      body.newPassword,
      req.originalUrl,
    );
    return new BaseResponse(result);
  },
});

const setPasswordBodySchema = z.object({
  newPassword: z.string().min(8),
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/password/set",
  bodySchema: setPasswordBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      message: z.string(),
    }),
  }),
  openapi: {
    summary: "Set password for OAuth users",
    tags: ["User"],
    operationId: "setPassword",
    description:
      "Allows users who signed up with OAuth to set a password for credential-based login.",
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const user = await UserService.getUserById(userId, req.originalUrl);
    if (user?.hasPassword) {
      throw new ValidationError(
        "User already has a password set",
        req.originalUrl,
      );
    }

    await auth.api.setPassword({
      body: {
        newPassword: body.newPassword,
      },
      headers: req.headers,
    });

    return new BaseResponse({ message: "Password set successfully" });
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "get",
  path: "/me",
  responseSchema: baseResponseSchema.extend({
    data: userSelectSchema,
  }),
  openapi: {
    summary: "Get current user",
    tags: ["User"],
    operationId: "getCurrentUser",
    description: "Returns the currently authenticated user",
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    console.log("user", req.user);

    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const user = await UserService.getUserById(userId, req.originalUrl);
    return new BaseResponse(user);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "patch",
  path: "/me",
  responseSchema: baseResponseSchema.extend({
    data: userSelectSchema,
  }),
  bodySchema: userInsertSchema,
  openapi: {
    summary: "Update current user",
    tags: ["User"],
    operationId: "updateCurrentUser",
    description: "Updates the currently authenticated user",
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const user = await UserService.updateUserById(
      userId,
      body,
      req.originalUrl,
    );
    return new BaseResponse(user);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/me/email/change/request",
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      message: z.string(),
    }),
  }),
  bodySchema: requestEmailChangeOtpBodySchema,
  openapi: {
    summary: "Request email change OTP",
    tags: ["User"],
    operationId: "requestEmailChangeOtp",
    description:
      "Sends a 6-digit OTP to the current (old) email before changing to the new email.",
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const result = await EmailChangeService.requestOtp(
      userId,
      body.newEmail,
      req.originalUrl,
    );

    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/me/email/change/confirm",
  responseSchema: baseResponseSchema.extend({
    data: userSelectSchema,
  }),
  bodySchema: confirmEmailChangeBodySchema,
  openapi: {
    summary: "Confirm email change OTP",
    tags: ["User"],
    operationId: "confirmEmailChangeOtp",
    description:
      "Verifies OTP that was sent to the current email and updates the user's email to the new value.",
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const user = await EmailChangeService.confirmChange(
      userId,
      body.newEmail,
      body.otp,
      req.originalUrl,
    );

    return new BaseResponse(user);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/me/avatar",
  responseSchema: baseResponseSchema.extend({
    data: userSelectSchema,
  }),
  upload: {
    category: "avatars",
    fields: [{ name: "avatar", maxCount: 1 }],
    fileSizeLimit: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  openapi: {
    summary: "Upload avatar",
    tags: ["User"],
    operationId: "uploadAvatar",
    description: "Uploads an avatar for the current user",
  },
  handler: async ({ req, files }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const avatar = files?.["avatar"]?.[0];
    if (!avatar) {
      throw new ValidationError("No avatar file provided", req.originalUrl);
    }

    const user = await UserService.uploadAvatar(
      userId,
      avatar,
      req.originalUrl,
    );
    return new BaseResponse(user);
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "delete",
  path: "/me",
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      success: z.literal(true),
    }),
  }),
  openapi: {
    summary: "Delete current user",
    tags: ["User"],
    operationId: "deleteCurrentUser",
    description: "Permanently deletes the currently authenticated user and all associated data",
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    await UserService.deleteUser(userId, req.originalUrl);

    return new BaseResponse({ success: true });
  },
});

createRoute({
  basePath,
  router: usersRouter,
  method: "get",
  path: "/me/cvs",
  responseSchema: baseResponseSchema.extend({
    data: z.array(userCvsSelectSchema),
  }),
  openapi: {
    summary: "Get current user cvs",
    tags: ["User"],
    operationId: "getCurrentUserCvs",
    description: "Returns the CVs for the currently authenticated user",
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const cvs = await UserService.getUserCvs(userId);
    return new BaseResponse(cvs);
  },
});

// ── Generate Proposal (AI) ──────────────────────────────────────────────

const generateProposalBodySchema = z.object({
  gigId: z.coerce.number().int().positive(),
  language: z.string().min(1).default("en"),
});

const proposalResponseDataSchema = z.object({
  proposal: z.string(),
  language: z.string(),
  platform: z.string(),
  proposal_type: z.string(),
  metadata: z.object({
    model: z.string(),
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    latency_ms: z.number(),
  }),
  validation: z.object({
    passed: z.boolean(),
    confidence: z.number(),
    issues: z.array(z.string()),
  }),
});

createRoute({
  basePath,
  router: usersRouter,
  method: "post",
  path: "/me/generate-proposal",
  bodySchema: generateProposalBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: proposalResponseDataSchema,
  }),
  openapi: {
    summary: "Generate a professional job proposal using AI",
    tags: ["User"],
    operationId: "generateProposal",
    description:
      "Generates a professional job proposal via the AI service. The user provides the gig ID and preferred language. The backend collects the current user's profile, CV, and gig details, then sends them to the AI service for proposal generation.",
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    // Fetch user data
    const user = await UserService.getUserById(userId, req.originalUrl);

    // Fetch user CVs and pick the first one
    const cvs = await UserService.getUserCvs(userId);
    if (!cvs || cvs.length === 0) {
      throw new ValidationError(
        "No CV found. Please upload a CV before generating a proposal.",
        req.originalUrl,
      );
    }
    const cv = cvs[0];

    // Fetch gig data
    const gig = await GigsQueries.findById(body.gigId, userId);
    if (!gig) {
      throw new ValidationError(
        `Gig with id ${body.gigId} not found`,
        req.originalUrl,
      );
    }

    try {
      const result = await ProposalService.generateProposal({
        language: body.language,
        user,
        gig,
        cv,
        context: req.originalUrl,
      });

      return new BaseResponse(result);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate proposal";

      throw new ApplicationError(
        502,
        message,
        "https://example.com/probs/ai-service-error",
        "AI Service Error",
        req.originalUrl,
      );
    }
  },
});
