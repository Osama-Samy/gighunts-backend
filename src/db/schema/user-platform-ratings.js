import { relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth.js";
import { platforms } from "./platforms.js";

export const userPlatformRatings = sqliteTable(
  "user_platform_ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    successRate: real("success_rate"),
    freeProposals: integer("free_proposals").default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.platformId] })],
);

export const userPlatformRatingsRelations = relations(
  userPlatformRatings,
  ({ one }) => ({
    user: one(user, {
      fields: [userPlatformRatings.userId],
      references: [user.id],
    }),
    platform: one(platforms, {
      fields: [userPlatformRatings.platformId],
      references: [platforms.id],
    }),
  }),
);
