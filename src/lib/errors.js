export class ApplicationError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} detail - Error message
   * @param {string} [type] - Error type
   * @param {string} [title] - Error title
   * @param {string} [instance] - Error instance
   */
  constructor(
    statusCode,
    detail,
    type = "about:blank",
    title = "Application Error",
    instance,
  ) {
    super(detail);
    this.statusCode = statusCode;
    this.detail = detail;
    this.type = type;
    this.title = title;
    this.instance = instance;
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class NotFoundError extends ApplicationError {
  /**
   * @param {string} [detail]
   * @param {string} [instance]
   */
  constructor(detail = "Resource not found", instance) {
    super(
      404,
      detail,
      "https://example.com/probs/not-found",
      "Not Found",
      instance,
    );
  }
}

export class UnauthorizedError extends ApplicationError {
  /**
   * @param {string} [detail]
   * @param {string} [instance]
   */
  constructor(detail = "Unauthorized", instance) {
    super(
      401,
      detail,
      "https://example.com/probs/unauthorized",
      "Unauthorized",
      instance,
    );
  }
}

export class ForbiddenError extends ApplicationError {
  /**
   * @param {string} [detail]
   * @param {string} [instance]
   */
  constructor(detail = "Forbidden", instance) {
    super(
      403,
      detail,
      "https://example.com/probs/forbidden",
      "Forbidden",
      instance,
    );
  }
}

export class ValidationError extends ApplicationError {
  /**
   * @param {string} [detail]
   * @param {string} [instance]
   */
  constructor(detail = "Validation failed", instance) {
    super(
      400,
      detail,
      "https://example.com/probs/validation-error",
      "Validation Error",
      instance,
    );
  }
}

export class ConflictError extends ApplicationError {
  /**
   * @param {string} [detail]
   * @param {string} [instance]
   */
  constructor(detail = "Conflict", instance) {
    super(
      409,
      detail,
      "https://example.com/probs/conflict",
      "Conflict",
      instance,
    );
  }
}
