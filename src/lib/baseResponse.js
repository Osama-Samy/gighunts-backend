import { z } from "zod";

export const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any(),
});

export class BaseResponse {
  /**
   * @param {any} data
   * @param {string} message
   * @param {boolean} success
   */
  constructor(data, message = "Success", success = true) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}
