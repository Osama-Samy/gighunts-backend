import { apiReference } from "@scalar/express-api-reference";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "./lib/auth.js";
import { ApplicationError } from "./lib/errors.js";
import { generateSpec, registry } from "./lib/registry.js";
import { requestLogger } from "./middleware/logger.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { gigsRouter } from "./modules/gigs/index.js";
import { platformsRouter } from "./modules/platforms/index.js";
import { skillsRouter } from "./modules/skills/index.js";
import { statsRouter } from "./modules/stats/index.js";
import { UserBasePath, usersRouter } from "./modules/users/index.js";
import { env } from "./lib/env.js";

export async function createApp() {
  const router = express.Router();
  const authApi = /** @type {any} */ (auth.api);
  const authOpenApiSpec =
    typeof authApi.generateOpenAPISchema === "function"
      ? await authApi.generateOpenAPISchema()
      : null;

  router.use(cors({
    origin: env.FRONT_END_URL,
    credentials: true,
  }));

  router.use(requestLogger);

  // Configure Better Auth
  router.use("/auth", toNodeHandler(auth.handler));

  // Configure OpenAPI with Scalar
  router.use(
    "/docs",
    apiReference({
      sources: [
        {
          title: "API",
          content: generateSpec(registry),
          default: true,
        },
        ...(authOpenApiSpec
          ? [
            {
              title: "Auth",
              content: authOpenApiSpec,
            },
          ]
          : []),
      ],
    }),
  );
  router.get("/openapi.json", (_req, res) => res.json(generateSpec(registry)));

  // Add middleware
  router.use(express.json());
  router.use(requireAuth);

  // Mount Modules
  router.use("/v1/platforms", platformsRouter);
  router.use("/v1/skills", skillsRouter);
  router.use("/v1/gigs", gigsRouter);
  router.use("/v1/stats", statsRouter);
  router.use(UserBasePath, usersRouter);

  // Global Not Found Handler`
  router.use((req, res) => {
    res.status(404).json({
      type: "https://example.com/probs/not-found",
      title: "Not Found",
      status: 404,
      detail: "The requested resource could not be found.",
      instance: req.path,
    });
  });

  // Global Error Handler
  router.use(
    /** @type {import("./types.js").ErrorHandler} */
    (err, req, res, _next) => {
      console.error("Global Error:", err);
      if (err.stack) console.error(err.stack);

      if (err instanceof ApplicationError) {
        return res.status(err.statusCode).json({
          type: err.type,
          title: err.title,
          status: err.statusCode,
          detail: err.detail,
          instance: err.instance || req.path,
        });
      }

      // Fallback for unhandled errors
      return res.status(500).json({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred",
        instance: req.path,
      });
    },
  );

  const app = express();
  app.use("/api", router);

  return app;
}
