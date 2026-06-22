import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import z from "zod";
import { env } from "./env.js";

extendZodWithOpenApi(z);
/**
 * Singleton OpenAPI registry instance.
 * Import this wherever you need to generate your OpenAPI spec.
 * @type {OpenAPIRegistry}
 */
export const registry = new OpenAPIRegistry();

/**
 * Generate OpenAPI spec
 * @param {OpenAPIRegistry} registry - OpenAPI registry instance
 * @returns {object} OpenAPI spec
 */
export function generateSpec(registry) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "GigsHunt API",
      version: "1.0.0",
      description: "API for GigsHunt",
    },
    servers: [{ url: `${env.BASE_URL}/api` }],
  });
}
