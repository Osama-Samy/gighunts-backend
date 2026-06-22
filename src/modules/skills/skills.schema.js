import z from "zod";

export const skillTargetSchema = z
  .object({
    skillId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.skillId !== undefined || data.name !== undefined, {
    message: "Either skillId or name is required",
  });

export const addSkillBodySchema = skillTargetSchema;

export const editSkillBodySchema = skillTargetSchema;

export const importSkillsFromCvResponseDataSchema = z.object({
  cvId: z.string(),
  cvLink: z.string(),
  atsScore: z.number().int().min(0).optional(),
  role: z.string().nullable().optional(),
  aiAnalysis: z.any().optional(),
  totalDetected: z.number().int().min(0),
  addedCount: z.number().int().min(0),
  limitReached: z.boolean(),
  addedSkills: z.array(
    z.object({
      skillId: z.number().int().positive(),
      skillName: z.string(),
    }),
  ),
  skippedSkills: z.array(z.string()),
});

export const addSkillResponseDataSchema = z.object({
  userId: z.string(),
  skillId: z.number().int().positive(),
  skillName: z.string(),
});

export const editSkillResponseDataSchema = addSkillResponseDataSchema;

export const deleteSkillResponseDataSchema = z.object({
  success: z.literal(true),
});

export const searchGlobalSkillsQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const userSkillSchema = z.object({
  skillId: z.number().int().positive(),
  skillName: z.string(),
});

export const getUserSkillsResponseDataSchema = z.array(userSkillSchema);

export const searchGlobalSkillsResponseDataSchema = z.array(userSkillSchema);
