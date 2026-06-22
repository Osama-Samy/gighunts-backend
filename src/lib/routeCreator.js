import multer from "multer";
import { asyncHandler } from "./asyncHandler.js";
import { buildMulter } from "./fileUpload.js";
import { registry } from "./registry.js";

/**
 * @typedef {import('zod').ZodType} ZodTypeAny
 * @typedef {import('@asteasolutions/zod-to-openapi').RouteConfig} RouteConfig
 */

/**
 * @template {ZodTypeAny} [TQuery=never]
 * @template {ZodTypeAny} [TBody=never]
 * @template {ZodTypeAny} [TForm=never]
 * @template {ZodTypeAny} [TResponse=never]
 *
 * @typedef {Object} HandlerContext
 * @property {import('express').Request} req - Express request object
 * @property {import('express').Response} res - Express response object
 * @property {TQuery extends ZodTypeAny ? ReturnType<TQuery['parse']> : undefined} query - Parsed and validated query parameters
 * @property {TBody extends ZodTypeAny ? ReturnType<TBody['parse']> : undefined} body - Parsed and validated request body
 * @property {TForm extends ZodTypeAny ? ReturnType<TForm['parse']> : undefined} form - Parsed and validated form fields (multipart)
 * @property {Record<string, Express.Multer.File[]> | undefined} files - Uploaded files keyed by field name
 */

/**
 * @template {ZodTypeAny} [TQuery=never]
 * @template {ZodTypeAny} [TBody=never]
 * @template {ZodTypeAny} [TForm=never]
 * @template {ZodTypeAny} [TResponse=never]
 *
 * @typedef {Object} RouteHandlerConfig
 *
 * -- Routing --
 * @property {string} [basePath=""] - Base path for the route.
 * @property {import('express').Router} router - Express router to register the route on.
 * @property {'get'|'post'|'delete'|'patch'} method - HTTP method.
 * @property {string} path - Express path (e.g. "/users/:id").
 *
 * -- Schemas (all optional) --
 * @property {ZodTypeAny} [paramsSchema] - Zod schema for req.params (path parameters).
 * @property {TQuery} [querySchema] - Zod schema for req.query.
 * @property {TBody} [bodySchema] - Zod schema for req.body.
 * @property {TForm} [formSchema] - Zod schema for non-file multipart form fields.
 * @property {TResponse} [responseSchema] - Zod schema for the response payload.
 *
 * -- File uploads --
 * @property {import("./fileUpload.js").UploadConfig} [upload] - When provided, enables multipart/form-data parsing and file uploads via multer. `formSchema` validates the non-file fields.
 * @property {import('express').RequestHandler[]} [middleware] - Extra Express middleware to run before validation and the handler.
 *
 * -- OpenAPI --
 * @property {Omit<RouteConfig, 'method'|'path'|'request'|'responses'> & {
 *   summary?: string,
 *   tags?: string[],
 *   operationId?: string,
 *   description?: string,
 *   successStatus?: number,
 * }} openapi - OpenAPI metadata for the route.
 *
 * -- Handler --
 * @property {(ctx: HandlerContext<TQuery, TBody, TForm, TResponse>) => Promise<import('zod').infer<TResponse>>} handler - Async handler function
 */

/**
 * Registers a validated, OpenAPI-documented Express route.
 *
 * The handler receives parsed + validated `query`, `body`, `form`, and `files`.
 * Its return value is validated against `responseSchema` (if provided)
 * and sent via `res.json()`.
 *
 * Validation failures are responded to immediately with HTTP 400 and
 * the raw ZodError object.
 *
 * @template {ZodTypeAny} TQuery
 * @template {ZodTypeAny} TBody
 * @template {ZodTypeAny} TForm
 * @template {ZodTypeAny} TResponse
 * @param {RouteHandlerConfig<TQuery, TBody, TForm, TResponse>} config
 *
 * @example
 * import { z } from 'zod';
 * import { router } from './router.js';
 * import { createRoute } from './routeHandler.js';
 *
 * const UserSchema = z.object({ id: z.string(), name: z.string() });
 *
 * createRoute({
 *   router,
 *   method: 'get',
 *   path: '/users',
 *   querySchema: z.object({ page: z.coerce.number().default(1) }),
 *   responseSchema: z.array(UserSchema),
 *   openapi: {
 *     summary: 'List users',
 *     tags: ['Users'],
 *     operationId: 'listUsers',
 *   },
 *   handler: async ({ query }) => {
 *     return getUsersPage(query.page);
 *   },
 * });
 *
 *
 * @example — Image upload route
 * createRoute({
 *   router,
 *   method: 'post',
 *   path: '/avatars',
 *   upload: {
 *     category: 'avatars',
 *     fields: [{ name: 'avatar', maxCount: 1 }],
 *     fileSizeLimit: 2 * 1024 * 1024,           // 2 MB
 *     allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
 *   },
 *   formSchema: z.object({ userId: z.string() }),
 *   responseSchema: z.object({ url: z.string() }),
 *   openapi: { summary: 'Upload avatar', tags: ['Users'], operationId: 'uploadAvatar' },
 *   handler: async ({ form, files }) => {
 *     const [file] = files.avatar;          // Express.Multer.File
 *     const url = await storeImage(file.buffer, file.mimetype);
 *     return { url };
 *   },
 * });
 */
export function createRoute({
  basePath = "",
  router,
  method,
  path,
  paramsSchema,
  querySchema,
  bodySchema,
  formSchema,
  responseSchema,
  upload: uploadConfig,
  middleware: extraMiddleware = [],
  openapi,
  handler,
}) {
  const { successStatus = 200, ...openapiRest } = openapi ?? {};

  // ── Register with OpenAPI ────────────────────────────────────────────────
  /** @type {RouteConfig['request']} */
  const request = {
    // headers: {},
  };
  if (paramsSchema)
    request.params = /** @type {import('zod').ZodObject<any>} */ (
      /** @type {unknown} */ (paramsSchema)
    );

  if (querySchema)
    request.query = /** @type {import('zod').ZodObject<any>} */ (
      /** @type {unknown} */ (querySchema)
    );

  if (uploadConfig) {
    // Describe the multipart body in OpenAPI.
    // We merge the declared file fields with any extra scalar fields from formSchema.
    // TODO: any here
    /** @type {Record<string, any>} */
    const multipartProperties = {};

    for (const field of uploadConfig.fields) {
      if (field.maxCount && field.maxCount > 1) {
        multipartProperties[field.name] = {
          type: "array",
          items: { type: "string", format: "binary" },
        };
      } else {
        multipartProperties[field.name] = { type: "string", format: "binary" };
      }
    }

    // Attach additional scalar properties from formSchema if it's a ZodObject.
    if (formSchema && "shape" in formSchema) {
      const shape = /** @type {import('zod').ZodObject<any>} */ (
        /** type {unknown} */ formSchema.shape
      );

      for (const key of Object.keys(shape)) {
        if (!(key in multipartProperties)) {
          multipartProperties[key] = { type: "string" };
        }
      }
    }

    request.body = {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: multipartProperties,
          },
        },
      },
      required: true,
    };
  } else if (bodySchema) {
    request.body = {
      content: { "application/json": { schema: bodySchema } },
      required: true,
    };
  }

  /** @type {RouteConfig['responses']} */
  const responses = {
    [successStatus]: responseSchema
      ? {
          description: "Success",
          content: { "application/json": { schema: responseSchema } },
        }
      : { description: "Success" },
    400: { description: "Validation error" },
    404: { description: "Not found" },
    500: { description: "Internal Server Error" },
  };

  const openApiPath = `${basePath}${path}`.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

  registry.registerPath({
    method,
    path: openApiPath,
    request,
    responses,
    security: [{ [bearerAuth.name]: [] }],
    ...openapiRest,
  });

  // ── Build middleware stack ───────────────────────────────────────────────
  /** @type {import('express').RequestHandler[]} */
  const middleware = [];

  if (Array.isArray(extraMiddleware) && extraMiddleware.length > 0) {
    middleware.push(...extraMiddleware);
  }

  if (uploadConfig) {
    const upload = buildMulter(uploadConfig);
    const multerFields = uploadConfig.fields.map(({ name, maxCount = 1 }) => ({
      name,
      maxCount,
    }));

    // Multer errors (file-too-large, wrong type, etc.) bubble up to the next
    // error handler. We catch them here to return a clean 400 instead.
    middleware.push((req, res, next) => {
      upload.fields(multerFields)(req, res, (err) => {
        if (!err) return next();

        const status =
          err instanceof multer.MulterError || err.status === 400 ? 400 : 500;
        const message =
          err instanceof multer.MulterError
            ? multerCodeToMessage(err.code, err.field)
            : (err.message ?? "File upload error");

        res.status(status).json({ message });
      });
    });
  }

  // ── Register Express route ───────────────────────────────────────────────
  router[method](
    path,
    ...middleware,
    asyncHandler(async (req, res) => {
      // Validate query params
      let query = /** @type {any} */ (undefined);
      if (querySchema) {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json(result.error);
        }
        query = result.data;
      }

      // Validate request body
      let body = /** @type {any} */ (undefined);
      if (bodySchema) {
        const result = bodySchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json(result.error);
        }
        body = result.data;
      }

      // Validate multipart form fields (non-file fields only)
      let form = /** @type {any} */ (undefined);
      if (formSchema) {
        const result = formSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json(result.error);
        }
        form = result.data;
      }

      // Collect uploaded files (keyed by field name, value = array of Multer files)
      const files =
        uploadConfig && req.files && !Array.isArray(req.files)
          ? /** @type {Record<string, Express.Multer.File[]>} */ (req.files)
          : undefined;

      // Call the handler
      const responseData = await handler({
        req,
        res,
        query,
        body,
        form,
        files,
      });

      // Validate response (optional, useful during development)
      if (responseSchema) {
        console.log(JSON.stringify(responseData, null, 2));
        const result = responseSchema.safeParse(responseData);
        if (!result.success) {
          // Response shape mismatch is a server-side bug — log it, return 500
          console.error(
            `[createRoute] Response validation failed for ${method.toUpperCase()} ${path}:`,
            result.error,
          );
          return res
            .status(500)
            .json({ message: "Internal response schema mismatch" });
        }
        return res.status(successStatus).json(result.data);
      }

      return res.status(successStatus).json(responseData);
    }),
  );
}

/**
 * Converts a multer error code into a human-readable message.
 *
 * @param {string} code - multer.MulterError.code value
 * @param {string | undefined} field
 * @returns {string}
 */
function multerCodeToMessage(code, field) {
  switch (code) {
    case "LIMIT_FILE_SIZE":
      return field
        ? `File "${field}" exceeds the maximum allowed size.`
        : "A file exceeds the maximum allowed size.";
    case "LIMIT_FILE_COUNT":
      return field
        ? `Too many files uploaded for field "${field}".`
        : "Too many files uploaded.";
    case "LIMIT_UNEXPECTED_FILE":
      return `Unexpected file field "${field}".`;
    default:
      return `File upload error (${code}).`;
  }
}

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
});
