import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { registry } from "../../lib/registry.js";
import { user } from "./auth.js";
import { gigs } from "./gigs.js";

export const userGigs = sqliteTable(
  "user_gigs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gigId: integer("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    status: integer("status").notNull().default(1), // 1 for active, 2 for inactive, 3 for pending, 4 for completed
  },
  (t) => [primaryKey({ columns: [t.userId, t.gigId] })],
);

export const userGigsRelations = relations(userGigs, ({ one }) => ({
  user: one(user, {
    fields: [userGigs.userId],
    references: [user.id],
  }),
  gig: one(gigs, {
    fields: [userGigs.gigId],
    references: [gigs.id],
  }),
}));

export const userGigSelect = registry.register("userGigSelect", createSelectSchema(userGigs));
export const userGigInsert = registry.register("userGigInsert", createInsertSchema(userGigs));
