import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.js";
import { gigs } from "./gigs.js";

export const userBookmarks = sqliteTable(
  "user_bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gigId: integer("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(strftime('%s', 'now'))`,
    ).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gigId] })],
);

export const userBookmarksRelations = relations(userBookmarks, ({ one }) => ({
  user: one(user, {
    fields: [userBookmarks.userId],
    references: [user.id],
  }),
  gig: one(gigs, {
    fields: [userBookmarks.gigId],
    references: [gigs.id],
  }),
}));
