import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

/**
 * @template T
 */
export class PaginatedResponse {
  /**
   * @param {T[]} data
   * @param {number} page
   * @param {number} per_page
   * @param {number} total
   */
  constructor(data, page, per_page, total) {
    this.data = data;
    this.pagination = {
      page,
      per_page,
      total,
      last_page: Math.ceil(total / per_page),
    };
  }
}

/**
 * @template T
 * @param {import("zod").ZodType<T>} itemSchema
 */
export const paginatedResponseSchema = (itemSchema) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      per_page: z.number(),
      total: z.number(),
      last_page: z.number(),
    }),
  });

/**
 * @template T
 * @param {T[]} data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {PaginatedResponse<T>}
 */
export function buildPaginatedResponse(data, total, page, limit) {
  return new PaginatedResponse(data, page, limit, total);
}
