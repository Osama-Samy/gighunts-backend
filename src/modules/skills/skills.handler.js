import { Router } from "express";
import z from "zod";
import { BaseResponse, baseResponseSchema } from "../../lib/baseResponse.js";
import { UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { createRoute } from "../../lib/routeCreator.js";
import {
  addSkillBodySchema,
  addSkillResponseDataSchema,
  deleteSkillResponseDataSchema,
  editSkillBodySchema,
  editSkillResponseDataSchema,
  getUserSkillsResponseDataSchema,
  importSkillsFromCvResponseDataSchema,
  searchGlobalSkillsQuerySchema,
  searchGlobalSkillsResponseDataSchema,
} from "./skills.schema.js";
import { SkillsService } from "./skills.service.js";

export const skillsRouter = Router();
export const basePath = "/v1/skills";

createRoute({
  basePath,
  router: skillsRouter,
  method: "get",
  path: "/search",
  querySchema: searchGlobalSkillsQuerySchema,
  responseSchema: baseResponseSchema.extend({
    data: searchGlobalSkillsResponseDataSchema,
  }),
  openapi: {
    summary: "Search all skills",
    tags: ["Skills"],
    operationId: "searchGlobalSkills",
    description: "Performs a fuzzy search across all skills in the database",
    successStatus: 200,
  },
  handler: async ({ query }) => {
    const data = await SkillsService.searchAllSkills(query.q, query.limit);
    return new BaseResponse(data);
  },
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "get",
  path: "/",
  responseSchema: baseResponseSchema.extend({
    data: getUserSkillsResponseDataSchema,
  }),
  openapi: {
    summary: "Get current user skills",
    tags: ["Skills"],
    operationId: "getCurrentUserSkills",
    description:
      "Returns all skills assigned to the currently authenticated user",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await SkillsService.getUserSkills(userId);

    return new BaseResponse(data);
  },
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "post",
  path: "/",
  bodySchema: addSkillBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: addSkillResponseDataSchema,
  }),
  openapi: {
    summary: "Add skill to current user",
    tags: ["Skills"],
    operationId: "addSkillToCurrentUser",
    description:
      "Adds a skill to the currently authenticated user by skillId, or creates it by name if not found",
    successStatus: 201,
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await SkillsService.addSkillToUser(
      userId,
      body,
      req.originalUrl,
    );

    return new BaseResponse(data, "Skill added successfully");
  },
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "post",
  path: "/import-cv",
  upload: {
    category: "cvs",
    fields: [{ name: "file", maxCount: 1 }],
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
  responseSchema: baseResponseSchema.extend({
    data: importSkillsFromCvResponseDataSchema,
  }),
  openapi: {
    summary: "Import skills from CV",
    tags: ["Skills"],
    operationId: "importSkillsFromCv",
    description:
      "Uploads a CV PDF to AI analyzer, extracts candidate_profile.skills, and adds them to the authenticated user",
    successStatus: 201,
  },
  handler: async ({ req, files }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const uploadedFile = files?.["file"]?.[0];
    if (!uploadedFile) {
      throw new ValidationError(
        "CV file is required (form-data key: file)",
        req.originalUrl,
      );
    }

    const data = await SkillsService.importSkillsFromCv(
      userId,
      uploadedFile,
      req.originalUrl,
    );

    return new BaseResponse(data, "Skills imported from CV successfully");
  },
});

const deleteCvParamsSchema = z.object({
  cvId: z.string(),
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "delete",
  path: "/import-cv/:cvId",
  paramsSchema: deleteCvParamsSchema,
  responseSchema: baseResponseSchema.extend({
    data: deleteSkillResponseDataSchema,
  }),
  openapi: {
    summary: "Delete user CV",
    tags: ["Skills"],
    operationId: "deleteUserCv",
    description: "Removes an uploaded CV for the currently authenticated user",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const params = deleteCvParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationError("Invalid cvId in URL", req.originalUrl);
    }

    const data = await SkillsService.deleteUserCv(
      userId,
      params.data.cvId,
      req.originalUrl,
    );

    return new BaseResponse(data, "CV deleted successfully");
  },
});

const editSkillParamsSchema = z.object({
  skillId: z.coerce.number().int().positive(),
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "patch",
  path: "/:skillId",
  paramsSchema: editSkillParamsSchema,
  bodySchema: editSkillBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: editSkillResponseDataSchema,
  }),
  openapi: {
    summary: "Edit current user skill",
    tags: ["Skills"],
    operationId: "editCurrentUserSkill",
    description:
      "Replaces one skill mapping for the authenticated user with another skill (by id or by name)",
    successStatus: 200,
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const params = editSkillParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationError("Invalid skillId in URL", req.originalUrl);
    }

    const data = await SkillsService.editUserSkill(
      userId,
      params.data.skillId,
      body,
      req.originalUrl,
    );

    return new BaseResponse(data, "Skill updated successfully");
  },
});

createRoute({
  basePath,
  router: skillsRouter,
  method: "delete",
  path: "/:skillId",
  paramsSchema: editSkillParamsSchema,
  responseSchema: baseResponseSchema.extend({
    data: deleteSkillResponseDataSchema,
  }),
  openapi: {
    summary: "Delete current user skill",
    tags: ["Skills"],
    operationId: "deleteCurrentUserSkill",
    description: "Removes a skill mapping for the currently authenticated user",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const params = editSkillParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationError("Invalid skillId in URL", req.originalUrl);
    }

    const data = await SkillsService.deleteUserSkill(
      userId,
      params.data.skillId,
      req.originalUrl,
    );

    return new BaseResponse(data, "Skill deleted successfully");
  },
});
