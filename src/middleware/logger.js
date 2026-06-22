import crypto from "crypto";
import { db } from "../db/index.js";
import { logToDb } from "../lib/logger.js";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const requestLogger = (req, res, next) => {
  const requestId = crypto.randomUUID();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const query = req.query;
  const ip = req.ip ?? req.socket?.remoteAddress;
  const headers = req.headers;

  // Attach requestId so downstream handlers can reference it
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  let bodyData = null;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    bodyData = req.body;
  }

  const start = performance.now();

  res.on("finish", () => {
    const ms = Math.round(performance.now() - start);
    const status = res.statusCode;

    logToDb({
      db,
      level: levelFromStatus(status),
      message: `${method} ${url} → ${status} (${ms}ms)`,
      url,
      method,
      query,
      data: bodyData,
      context: { requestId, ip, ms, status, headers },
    });
  });

  next();
};

/**
 * Determine log level from HTTP status code.
 * @param {number} status
 * @returns {"info" | "warn" | "error"}
 */
const levelFromStatus = (status) => {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
};
