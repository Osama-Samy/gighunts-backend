import { Router } from "express";
import { BaseResponse, baseResponseSchema } from "../../lib/baseResponse.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { createRoute } from "../../lib/routeCreator.js";
import {
  userGigStatsSchema,
  userPlatformSuccessRatesSchema,
} from "./stats.schema.js";
import { StatsService } from "./stats.service.js";

export const statsRouter = Router();
export const basePath = "/v1/stats";

createRoute({
  basePath,
  router: statsRouter,
  method: "get",
  path: "/gigs",
  responseSchema: baseResponseSchema.extend({
    data: userGigStatsSchema,
  }),
  openapi: {
    summary: "Get current user gig stats",
    tags: ["Stats"],
    operationId: "getCurrentUserGigStats",
    description:
      "Returns total gigs for current user, counts by Pending/Closed/Completed, and successRate",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await StatsService.getUserGigStats(userId, req.originalUrl);
    return new BaseResponse(data);
  },
});

createRoute({
  basePath,
  router: statsRouter,
  method: "get",
  path: "/platforms/success-rate",
  responseSchema: baseResponseSchema.extend({
    data: userPlatformSuccessRatesSchema,
  }),
  openapi: {
    summary: "Get current user platform success rates",
    tags: ["Stats"],
    operationId: "getCurrentUserPlatformSuccessRates",
    description:
      "Returns all platforms with the current user successRate per platform and stores them in user_platform_ratings",
    successStatus: 200,
  },
  handler: async ({ req }) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError("No user id found", req.originalUrl);
    }

    const data = await StatsService.getUserPlatformSuccessRates(
      userId,
      req.originalUrl,
    );
    return new BaseResponse(data);
  },
});
