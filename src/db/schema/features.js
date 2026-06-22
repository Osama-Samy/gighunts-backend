import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const featureFlags = sqliteTable("feature_flags", {
  key: text("key").primaryKey(),
  isEnabled: integer("is_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
