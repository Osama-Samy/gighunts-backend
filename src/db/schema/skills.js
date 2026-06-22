import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { gigSkills } from "./gig-skills.js";
import { skillCategories } from "./skill-categories.js";
import { userSkills } from "./user-skills.js";
import { registry } from "../../lib/registry.js";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  categoryId: integer("category_id").references(() => skillCategories.id, {
    onDelete: "set null",
  }),
});

export const skillsRelations = relations(skills, ({ one, many }) => ({
  category: one(skillCategories, {
    fields: [skills.categoryId],
    references: [skillCategories.id],
  }),
  gigSkills: many(gigSkills),
  userSkills: many(userSkills),
}));


export const skillSelectSchema = registry.register("skillSelect", createSelectSchema(skills));
export const skillInsertSchema = registry.register("skillInsert", createInsertSchema(skills));