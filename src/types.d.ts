import { NextFunction, Request, Response } from "express";
import { db } from "./db/index.js";
import * as schema from "./db/schema/index.js";

// Express error handler
export type ErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => unknown;

// logger middleware data
export type LogData = {
  db: typeof db;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: Record<string, unknown>;
  url?: string;
  method?: string;
  query?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

// user schema types
export type UserSelect = typeof schema.user.$inferSelect & { hasPassword?: boolean };
export type UserInsert = Partial<
  Omit<typeof schema.user.$inferInsert, "id" | "createdAt" | "updatedAt" | "emailVerified">
>;

export type AccountSelect = typeof schema.account.$inferSelect;
export type AccountInsert = typeof schema.account.$inferInsert;

export type SessionSelect = typeof schema.session.$inferSelect;
export type SessionInsert = typeof schema.session.$inferInsert;

export type PlatformSelect = typeof schema.platforms.$inferSelect;
export type PlatformInsert = typeof schema.platforms.$inferInsert;

export type SkillSelect = typeof schema.skills.$inferSelect;
export type SkillInsert = typeof schema.skills.$inferInsert;

export type GigSelect = typeof schema.gigs.$inferSelect;
export type GigInsert = typeof schema.gigs.$inferInsert;

export type UserGigSelect = typeof schema.userGigs.$inferSelect;
export type UserGigInsert = typeof schema.userGigs.$inferInsert;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { id: string; email: string; name: string };
      session?: { id: string };
    }
  }
}
