import { Router } from "express";
import { z } from "zod";
import { gigSkillsSelect } from "../../db/schema/gig-skills.js";
import { gigSelectSchema } from "../../db/schema/gigs.js";
import { platformSelectSchema } from "../../db/schema/platforms.js";
import { skillSelectSchema } from "../../db/schema/skills.js";
import { userGigSelect } from "../../db/schema/user-gigs.js";
import { BaseResponse, baseResponseSchema } from "../../lib/baseResponse.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { paginatedResponseSchema } from "../../lib/pagination.js";
import { createRoute } from "../../lib/routeCreator.js";
import {
  gigIdParamSchema,
  gigQuerySchema,
  updateUserGigBodySchema,
  userGigsQuerySchema,
} from "./gigs.schema.js";
import { GigsService } from "./gigs.service.js";

export const gigsApp = Router();
export const basePath = "/v1/gigs";

createRoute({
  basePath,
  router: gigsApp,
  method: "get",
  path: "/",
  querySchema: gigQuerySchema,
  responseSchema: baseResponseSchema.extend({
    data: paginatedResponseSchema(
      gigSelectSchema
        .extend({
          isBookmarked: z.boolean(),
        })
        .optional(),
    ),
  }),
  openapi: {
    summary: "Get all gigs paginated (with search)",
    tags: ["Gigs"],
    operationId: "getAllGigs",
  },
  handler: async ({ req, query }) => {
    const queryWithUserId = { ...query, userId: req.user?.id };
    const result = await GigsService.getAllGigs(queryWithUserId, req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "get",
  path: "/recommended",
  querySchema: gigQuerySchema,
  responseSchema: baseResponseSchema.extend({
    data: paginatedResponseSchema(
      gigSelectSchema.extend({
        isBookmarked: z.boolean(),
        matchedSkillsCount: z.number(),
        matchPercentage: z.number(),
      }),
    ),
  }),
  openapi: {
    summary: "Get recommended gigs based on user skills",
    tags: ["Gigs"],
    operationId: "getRecommendedGigs",
  },
  handler: async ({ req, query }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.getRecommendedGigs(userId, query, req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "get",
  path: "/me",
  querySchema: userGigsQuerySchema,
  responseSchema: baseResponseSchema.extend({
    data: paginatedResponseSchema(
      z.object({
        gig: gigSelectSchema,
        status: z.number(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    ),
  }),
  openapi: {
    summary: "Get all user gigs",
    tags: ["Gigs"],
    operationId: "getUserGigs",
  },
  handler: async ({ req, query }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.getUserGigs(userId, query, req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "get",
  path: "/bookmarks",
  querySchema: gigQuerySchema,
  responseSchema: baseResponseSchema.extend({
    data: paginatedResponseSchema(
      z.object({
        gig: gigSelectSchema,
        createdAt: z.date(),
      }),
    ),
  }),
  openapi: {
    summary: "Get user bookmarked gigs",
    tags: ["Gigs"],
    operationId: "getUserBookmarks",
  },
  handler: async ({ req, query }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.getUserBookmarks(userId, query, req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "get",
  path: "/:id",
  paramsSchema: gigIdParamSchema,
  responseSchema: baseResponseSchema.extend({
    data: gigSelectSchema.extend({
      platform: platformSelectSchema.nullish(),
      gigSkills: gigSkillsSelect
        .extend({
          skill: skillSelectSchema.nullish(),
        })
        .array(),
      isBookmarked: z.boolean(),
    }),
  }),
  openapi: {
    summary: "Get single gig details",
    tags: ["Gigs"],
    operationId: "getGigDetails",
  },
  handler: async ({ req, req: { params } }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }
    const gig = await GigsService.getGigById(Number(params["id"]), userId, req.originalUrl);
    return new BaseResponse(gig);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "post",
  path: "/:id/bookmark",
  paramsSchema: gigIdParamSchema,
  responseSchema: baseResponseSchema.extend({
    data: z.object({ bookmarked: z.boolean() }),
  }),
  openapi: {
    summary: "Bookmark a gig",
    tags: ["Gigs"],
    operationId: "bookmarkGig",
  },
  handler: async ({ req, req: { params } }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.toggleBookmark(userId, Number(params["id"]), req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "post",
  path: "/:id/track",
  paramsSchema: gigIdParamSchema,
  responseSchema: baseResponseSchema.extend({
    data: userGigSelect,
  }),
  openapi: {
    summary: "Track a gig",
    tags: ["Gigs"],
    operationId: "trackGig",
  },
  handler: async ({ req, req: { params } }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.trackGig(userId, Number(params["id"]), req.originalUrl);
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "patch",
  path: "/me/:id",
  paramsSchema: gigIdParamSchema,
  bodySchema: updateUserGigBodySchema,
  responseSchema: baseResponseSchema.extend({
    data: userGigSelect,
  }),
  openapi: {
    summary: "Modify user gig status",
    tags: ["Gigs"],
    operationId: "updateUserGigStatus",
  },
  handler: async ({ req, req: { params }, body }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.updateUserGigStatus(
      userId,
      Number(params["id"]),
      body.status,
      req.originalUrl,
    );
    return new BaseResponse(result);
  },
});

createRoute({
  basePath,
  router: gigsApp,
  method: "delete",
  path: "/me/:id",
  paramsSchema: gigIdParamSchema,
  responseSchema: baseResponseSchema.extend({
    data: userGigSelect,
  }),
  openapi: {
    summary: "Remove user gig (set it as closed)",
    tags: ["Gigs"],
    operationId: "closeUserGig",
  },
  handler: async ({ req, req: { params } }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("Authentication required", req.originalUrl);
    }

    const result = await GigsService.closeUserGig(userId, Number(params["id"]), req.originalUrl);
    return new BaseResponse(result);
  },
});
