import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";
import { USER_GIG_STATUS } from "./user-gig-status.js";

export const gigQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.coerce.number().optional(),
  platformId: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  skillIds: z
    .union([z.string(), z.array(z.number()), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") return val.split(",").map(Number);
      return val.map(Number);
    }),
  matchLevels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") return val.split(",");
      return val;
    }),
  durations: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === "string") return val.split(",");
      return val;
    }),
});

export const gigIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const userGigStatusSchema = z.nativeEnum(USER_GIG_STATUS);

export const trackGigBodySchema = z.object({
  gigId: z.number().int().positive(),
});

export const updateUserGigBodySchema = z.object({
  status: userGigStatusSchema,
});

export const userGigsQuerySchema = paginationSchema.extend({
  status: z.coerce.number().optional(),
});
