import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import z from "zod";
import { registry } from "../../lib/registry.js";
import { userBookmarks } from "./user-bookmarks.js";
import { userCvs } from "./user-cvs.js";
import { userGigs } from "./user-gigs.js";
import { userPlatformRatings } from "./user-platform-ratings.js";
import { userSkills } from "./user-skills.js";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(true).notNull(),
  image: text("image"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  darkMode: integer("dark_mode", { mode: "boolean" }).default(false),
  appNotifications: integer("app_notifications", { mode: "boolean" }).default(true),
  emailNotifications: integer("email_notifications", {
    mode: "boolean",
  }).default(true),
  language: text("language").default("en"),
  inAppBrowser: integer("in_app_browser", { mode: "boolean" }).default(true),
  platformFilters: text("platform_filters", { mode: "json" }).default(JSON.stringify([])),
  phone: text("phone"),
  cvLink: text("cv_link"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Relations

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),

  userGigs: many(userGigs),
  userSkills: many(userSkills),
  bookmarks: many(userBookmarks),
  platformRatings: many(userPlatformRatings),
  userCvs: many(userCvs),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Schemas

const _userSelectSchema = createSelectSchema(user, {
  platformFilters: z.unknown(),
}).extend({
  hasPassword: z.boolean().optional(),
});
export const userSelectSchema = registry.register("User", _userSelectSchema);

export const userInsertSchema = registry.register(
  "UserInsert",
  createInsertSchema(user, {
    email: z.email(),
  })
    .omit({ id: true, createdAt: true, updatedAt: true, emailVerified: true })
    .partial()
    .required({ name: true, email: true }),
);

export const accountSelectSchema = registry.register("AccountSelect", createSelectSchema(account));
export const accountInsertSchema = registry.register("AccountInsert", createInsertSchema(account));

export const sessionSelectSchema = registry.register("SessionSelect", createSelectSchema(session));
export const sessionInsertSchema = registry.register("SessionInsert", createInsertSchema(session));
