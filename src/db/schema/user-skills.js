import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.js";
import { skills } from "./skills.js";

export const userSkills = sqliteTable(
  "user_skills",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: integer("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(user, {
    fields: [userSkills.userId],
    references: [user.id],
  }),
  skill: one(skills, {
    fields: [userSkills.skillId],
    references: [skills.id],
  }),
}));
