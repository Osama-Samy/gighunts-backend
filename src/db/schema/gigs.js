import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { registry } from "../../lib/registry.js";
import { gigSkills } from "./gig-skills.js";
import { platforms } from "./platforms.js";
import { userBookmarks } from "./user-bookmarks.js";
import { userGigs } from "./user-gigs.js";

export const gigs = sqliteTable("gigs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").unique(),
  price: real("price"),
  priceText: text("price_text"),
  minPrice: real("min_price"),
  maxPrice: real("max_price"),
  currency: text("currency"),
  duration: text("duration"),
  type: integer("type"), // 1 for fixed, 2 for hourly
  creationTime: integer("creation_time", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ),
  platformId: integer("platform_id").references(() => platforms.id),
  category: text("category"),
  language: text("language"),
  source: text("source"),
  key: text("key"),
});

export const gigsRelations = relations(gigs, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [gigs.platformId],
    references: [platforms.id],
  }),
  userGigs: many(userGigs),
  gigSkills: many(gigSkills),
  bookmarks: many(userBookmarks),
}));

const _gigSelectSchema = createSelectSchema(gigs, {
  minPrice: (s) => s.nullish(),
  maxPrice: (s) => s.nullish(),
  priceText: (s) => s.nullish(),
  currency: (s) => s.nullish(),
  source: (s) => s.nullish(),
  key: (s) => s.nullish(),
  price: (s) => s.nullish(),
});

export const gigSelectSchema = registry.register("gigSelectSchema", _gigSelectSchema);
export const gigInsertSchema = registry.register("gigInsertSchema", createInsertSchema(gigs));
