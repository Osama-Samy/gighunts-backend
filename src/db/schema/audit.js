import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth.js";

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details", { mode: "json" }),
  ip: text("ip"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
