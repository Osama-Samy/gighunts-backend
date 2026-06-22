import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";

import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { registry } from "../../lib/registry.js";
import { gigs } from "./gigs.js";
import { skills } from "./skills.js";

export const gigSkills = sqliteTable(
  "gig_skills",
  {
    gigId: integer("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.gigId, t.skillId] })],
);

export const gigSkillsRelations = relations(gigSkills, ({ one }) => ({
  gig: one(gigs, {
    fields: [gigSkills.gigId],
    references: [gigs.id],
  }),
  skill: one(skills, {
    fields: [gigSkills.skillId],
    references: [skills.id],
  }),
}));

export const gigSkillsSelect = registry.register(
  "gigSkillSelect",
  createSelectSchema(gigSkills),
);
export const gigSkillsInsert = registry.register(
  "gigSkillInsert",
  createInsertSchema(gigSkills),
);
