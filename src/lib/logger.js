import { db } from "../db/index.js";
import { logs } from "../db/schema/logs.js";

/**
 * @param {import("../types.js").LogData} logData
 */
export const logToDb = ({
  db: customDb,
  level = "info",
  message,
  context,
  url,
  method,
  query,
  data,
}) => {
  const targetDb = customDb || db;
  const logColor = {
    info: "\x1b[36m", // Cyan
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    debug: "\x1b[35m", // Magenta
  }[level];

  console.log(`${logColor}[${level.toUpperCase()}]\x1b[0m ${message}`);
  if (context) console.log(`  Context:`, context);
  if (data && Object.keys(data).length > 0) console.log(`  Data:`, data);
  if (query && Object.keys(query).length > 0) console.log(`  Query:`, query);
  if (url) console.log(`  URL:`, url);
  if (method) console.log(`  Method:`, method);

  const insertData = {
    level,
    message,
    ...(context ? { context } : {}),
    ...(url ? { url } : {}),
    ...(method ? { method } : {}),
    ...(query && Object.keys(query).length > 0 ? { query } : {}),
    ...(data ? { data } : {}),
  };

  targetDb.insert(logs)
    .values(insertData)
    .execute()
    .catch((/** @type {Error} */ err) => {
      console.error("Failed to insert log into DB:", err);
    });
};

/**
 * @param {import("express").Request} req
 */
export const createLogger = (req) => {
  return {
    /**
     * @param {string} message
     * @param {Record<string, unknown>} params
     */
    info: (message, params) =>
      logToDb({
        db,
        level: "info",
        message,
        ...params,
        url: req?.originalUrl || req?.url,
        method: req?.method,
      }),
    /**
     * @param {string} message
     * @param {Record<string, unknown>} params
     */
    warn: (message, params) =>
      logToDb({
        db,
        level: "warn",
        message,
        ...params,
        url: req?.originalUrl || req?.url,
        method: req?.method,
      }),
    /**
     * @param {string} message
     * @param {Record<string, unknown>} params
     */
    error: (message, params) =>
      logToDb({
        db,
        level: "error",
        message,
        ...params,
        url: req?.originalUrl || req?.url,
        method: req?.method,
      }),
  };
};
