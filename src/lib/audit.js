import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";

/**
 *
 * @param {import("express").Request} req
 * @param {Record<string, string>} params
 */
export function logAudit(req, params) {
  // Execute asynchronously without blocking the request response
  (async () => {
    try {
      // Express header for real IP
      const ip = req.header("X-Forwarded-For") || req.ip || null;

      await db.insert(auditLogs).values({
        id: crypto.randomUUID().toString(),
        userId: params["userId"] ?? "",
        action: params["action"] ?? "",
        entity: params["entity"] ?? "",
        entityId: params["entityId"] ?? "",
        details: params["details"] ? params["details"] : null,
        ip,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to insert audit log:", err);
    }
  })();
}
