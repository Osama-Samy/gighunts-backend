import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { gigs } from "./gigs.js";
import { userPlatformRatings } from "./user-platform-ratings.js";
import { registry } from "../../lib/registry.js";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  imageUrl: text("image_url"),
  description: text("description"),
  platformUrl: text("platform_url"),
  youtubeUrl: text("youtube_url"),
  videoUrl: text("video_url"),
});

export const platformsRelations = relations(platforms, ({ many }) => ({
  gigs: many(gigs),
  userPlatformRatings: many(userPlatformRatings),
}));


export const platformSelectSchema = registry.register("PlatformSelect", createSelectSchema(platforms));
export const platformInsertSchema = registry.register("PlatformInsert", createInsertSchema(platforms));
