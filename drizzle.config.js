import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { env } from "./src/lib/env.js";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DB_FILE_NAME || "data/sqlite.db",
  },
});
