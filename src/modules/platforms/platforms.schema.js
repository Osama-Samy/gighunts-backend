import z from "zod";

export const platformSchema = z.object({
  id: z.number().int().positive(),
  imageUrl: z.string().nullable(),
  description: z.string().nullable(),
  platformUrl: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
});

export const listPlatformsResponseDataSchema = z.array(platformSchema);

export const addPlatformBodySchema = z.object({
  description: z.string().trim().min(1),
  imageUrl: z.string().trim().optional(),
  platformUrl: z.string().trim().optional(),
  youtubeUrl: z.string().trim().optional(),
  videoUrl: z.string().trim().optional(),
});

export const editPlatformBodySchema = z
  .object({
    description: z.string().trim().min(1).optional(),
    imageUrl: z.string().trim().optional(),
    platformUrl: z.string().trim().optional(),
    youtubeUrl: z.string().trim().optional(),
    videoUrl: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.description !== undefined ||
      data.imageUrl !== undefined ||
      data.platformUrl !== undefined ||
      data.youtubeUrl !== undefined ||
      data.videoUrl !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const deletePlatformResponseDataSchema = z.object({
  success: z.literal(true),
});

export const updatePlatformFiltersBodySchema = z.object({
  platformIds: z.array(z.coerce.number().int().positive()).max(100),
});
