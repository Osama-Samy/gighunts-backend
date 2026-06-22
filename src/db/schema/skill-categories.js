import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { skills } from "./skills.js";

export const skillCategories = sqliteTable("skill_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const skillCategoriesRelations = relations(
  skillCategories,
  ({ many }) => ({
    skills: many(skills),
  }),
);
