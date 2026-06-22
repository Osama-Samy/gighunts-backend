# Errors & Error Handling

## Overview

The platform uses custom error classes and a global error handler to standardize error responses across all APIs. Errors closely map to RFC 7807 (Problem Details for HTTP APIs).

## Defined Error Classes

Available in `src/shared/errors.js`:

- `ApplicationError`: Base class for errors.
- `NotFoundError` (404)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ValidationError` (400)

## Global Error Handler

Errors thrown in route handlers are intercepted by Express's global error middleware defined in `src/app.js`.

If an `ApplicationError` is detected, it returns a standard JSON response like this:

```json
{
  "type": "https://example.com/probs/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Resource not found",
  "instance": "/gigs/123"
}
```

Unhandled errors fall back to a generic **500 Internal Server Error** response.

## Usage

Throw any of the errors directly inside route handlers:

```js
import { NotFoundError } from "@/shared/errors.js";

if (!gig) {
  throw new NotFoundError("Gig not found");
}
```
