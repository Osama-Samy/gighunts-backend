# Logger

## Overview

A centralized logger is available that logs activities to both the console (with standard coloring styles) and the database `logs` table.

## Utilities

The logging utilities are placed in `src/lib/logger.js`. It provides standard logging levels: `info`, `warn`, `error`, `debug`.

## Database Insertion

Similar to `audit_logs`, the logger ensures minimal performance impact by leveraging non-blocking asynchronous execution to insert logs without awaiting them.

## Usage in Handlers

Use `createLogger(req)` within any handler. It provides methods like `.info`, `.warn`, and `.error` and automatically attaches request metadata (URL, Method).

```js
import { createLogger } from "@/lib/logger.js";

const logger = createLogger(req);
logger.info("Gig updated successfully", { data: updatedGig });
```

## Request Middleware Logger

All incoming requests are automatically logged via the `requestLogger` middleware (`src/middleware/logger.js`).
It traces:

- Endpoint (url, method)
- Query strings and request body payloads
- Execution time in ms (`ms`)
- HTTP Status Code (`status`)
