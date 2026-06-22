import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { registry } from "../../lib/registry.js";
import { user } from "./auth.js";

export const userCvs = sqliteTable("user_cvs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  cvLink: text("cv_link").notNull(),
  fileName: text("file_name"),
  skills: text("skills", { mode: "json" }),
  atsScore: integer("ats_score").default(0),
  coachFeedback: text("coach_feedback", { mode: "json" }),
  role: text("role"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const userCvsRelations = relations(userCvs, ({ one }) => ({
  user: one(user, {
    fields: [userCvs.userId],
    references: [user.id],
  }),
}));

export const userCvsSelectSchema = registry.register(
  "userCvsSelect",
  createSelectSchema(userCvs),
);
export const userCvsInsertSchema = registry.register(
  "userCvsInsert",
  createInsertSchema(userCvs),
);
