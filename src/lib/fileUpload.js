import { mkdir } from "node:fs/promises";
import multer from "multer";
import { env } from "./env.js";

/**
 * @typedef {Object} FileFieldConfig
 * @property {string} name - The form field name for this file input.
 * @property {number} [maxCount=1] - Maximum number of files accepted for this field.
 */

/**
 * @typedef {Object} UploadConfig
 * @property {FileFieldConfig[]} fields - File fields to accept.
 * @property {string} category - File category.
 * @property {number} [fileSizeLimit] - Max file size in bytes (default: 5 MB).
 * @property {string[]} [allowedMimeTypes] - Allowed MIME types (e.g. ['image/png', 'image/jpeg']). When omitted, all types are accepted.
 */

const DEFAULT_FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

/**
 * Builds a multer instance from an UploadConfig.
 *
 * @param {UploadConfig} uploadConfig
 * @returns {import('multer').Multer}
 */
export function buildMulter(uploadConfig) {
  const {
    fileSizeLimit = DEFAULT_FILE_SIZE_LIMIT,
    allowedMimeTypes,
    category,
  } = uploadConfig;

  return multer({
    storage: multer.diskStorage({
      destination: async (_req, _file, cb) => {
        const dest = `${env.UPLOADS_DIR}/${category}`;
        await mkdir(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        // Sanitize originalname: strip path traversal sequences and unsafe characters
        const sanitized = file.originalname
          .replace(/\.\.[/\\]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + sanitized);
      },
    }),
    limits: { fileSize: fileSizeLimit, files: 10 },
    fileFilter(_req, file, cb) {
      if (!allowedMimeTypes || allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          Object.assign(
            new Error(
              `Unsupported file type "${file.mimetype}". Allowed: ${allowedMimeTypes.join(", ")}`,
            ),
            { status: 400 },
          ),
        );
      }
    },
  });
}
