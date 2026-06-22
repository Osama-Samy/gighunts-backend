import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

const isTestEnv = process.env["NODE_ENV"] === "test";

const envPaths = isTestEnv ? [".env.test", ".env.test.local"] : [".env", ".env.local"];

for (const envPath of envPaths) {
  expand(
    config({
      path: path.resolve(process.cwd(), envPath),
      override: false,
    }),
  );
}

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1, "Better Auth Secret is required"),
  BETTER_AUTH_URL: z.string().min(1, "Better Auth URL is required"),
  NODE_ENV: z.enum(["dev", "production", "test"]).default("dev"),
  DB_FILE_NAME: z.string().default("data/sqlite.db"),
  PORT: z.coerce.number().default(3000),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  UPLOADS_DIR: z.string().default("uploads"),
  AI_CV_ANALYZE_URL: z.string().default("http://91.99.199.47:8001/analyze"),
  SCRAPER_URL: z.string(),
  BASE_URL: z.string().default("http://localhost:3001"),
  FRONT_END_URL: z.string().default("http://localhost:4321")
});

/**
 *
 * @param {NodeJS.ProcessEnv} rawEnv
 * @returns {z.infer<typeof EnvSchema>}
 */
export function parseEnv(rawEnv) {
  try {
    return EnvSchema.parse(rawEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:", error.flatten().fieldErrors);
      throw new Error("Invalid Environment Variables");
    }
    throw error;
  }
}

export const env = parseEnv(process.env);
