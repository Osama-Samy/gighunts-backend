import { Router } from "express";
import z from "zod";
import { BaseResponse, baseResponseSchema } from "../../lib/baseResponse.js";
import { UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { createRoute } from "../../lib/routeCreator.js";
import { PlatformsService } from "./platforms.service.js";
import {
  addPlatformBodySchema,
  deletePlatformResponseDataSchema,
  editPlatformBodySchema,
  listPlatformsResponseDataSchema,
  platformSchema,
  updatePlatformFiltersBodySchema,
} from "./platforms.schema.js";

export const platformsRouter = Router();
export const basePath = "/v1/platforms";

const editPlatformParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

createRoute({
  basePath,
  router: platformsRouter,
  method: "get",
  path: "/",
  responseSchema: baseResponseSchema.extend({
    data: listPlatformsResponseDataSchema,
  }),
  openapi: {
    summary: "List all platforms",
    tags: ["Platforms"],
    operationId: "listAllPlatforms",
    description: "Returns all platforms",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await PlatformsService.listAllPlatforms();
    return new BaseResponse(data);
  },
});

createRoute({
  basePath,
  router: platformsRouter,
  method: "delete",
  path: "/:id",
  paramsSchema: editPlatformParamsSchema,
  responseSchema: baseResponseSchema.extend({
    data: deletePlatformResponseDataSchema,
  }),
  openapi: {
    summary: "Delete platform",
    tags: ["Platforms"],
    operationId: "deletePlatform",
    description: "Deletes an existing platform",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const params = editPlatformParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationError("Invalid platform id in URL", req.originalUrl);
    }

    const data = await PlatformsService.deletePlatform(
      params.data.id,
      req.originalUrl,
    );
    return new BaseResponse(data, "Platform deleted successfully");
  },
});

createRoute({
  basePath,
  router: platformsRouter,
  method: "patch",
  path: "/:id",
  paramsSchema: editPlatformParamsSchema,
  bodySchema: editPlatformBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: platformSchema,
  }),
  openapi: {
    summary: "Edit platform",
    tags: ["Platforms"],
    operationId: "editPlatform",
    description: "Updates an existing platform",
    successStatus: 200,
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const params = editPlatformParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationError("Invalid platform id in URL", req.originalUrl);
    }

    const data = await PlatformsService.editPlatform(
      params.data.id,
      body,
      req.originalUrl,
    );
    return new BaseResponse(data, "Platform updated successfully");
  },
});

createRoute({
  basePath,
  router: platformsRouter,
  method: "post",
  path: "/",
  bodySchema: addPlatformBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: platformSchema,
  }),
  openapi: {
    summary: "Add platform",
    tags: ["Platforms"],
    operationId: "addPlatform",
    description: "Creates a new platform",
    successStatus: 201,
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await PlatformsService.addPlatform(body);
    return new BaseResponse(data, "Platform added successfully");
  },
});

createRoute({
  basePath,
  router: platformsRouter,
  method: "patch",
  path: "/me/filters",
  bodySchema: updatePlatformFiltersBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({
      platformFilters: z.array(z.number().int().positive()),
    }),
  }),
  openapi: {
    summary: "Update current user platform filters",
    tags: ["Platforms"],
    operationId: "updateCurrentUserPlatformFilters",
    description: "Updates current user selected platform IDs",
    successStatus: 200,
  },
  handler: async ({ req, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await PlatformsService.updateCurrentUserPlatformFilters(
      userId,
      body.platformIds,
      req.originalUrl,
    );

    return new BaseResponse(data, "Platform filters updated successfully");
  },
});
