import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const logs = sqliteTable("logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  level: text("level").notNull(),
  message: text("message").notNull(),
  context: text("context", { mode: "json" }),
  url: text("url"),
  method: text("method"),
  request: text("request", { mode: "json" }),
  query: text("query", { mode: "json" }),
  data: text("data", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
