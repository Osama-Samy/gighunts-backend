import z from "zod";

export const userGigStatsSchema = z.object({
  totalGigs: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
});

export const userPlatformSuccessRateSchema = z.object({
  platformId: z.number().int().positive(),
  platformName: z.string(),
  successRate: z.number().min(0).max(100),
});

export const userPlatformSuccessRatesSchema = z.array(
  userPlatformSuccessRateSchema,
);
