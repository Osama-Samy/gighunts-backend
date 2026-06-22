# Audit Logs

## Overview

Audit logs track critical user actions across the system. It helps to monitor who performed what action, when, and on which entity.

## Implementation

The application provides a `logAudit` helper from `src/lib/audit.js`.

It utilizes standard Node.js asynchronous execution to asynchronously push audit logs into the database without blocking the user request. Real client IP addresses are extracted using `X-Forwarded-For` headers from the Express request.

## Schema

Audit logs are stored in the `audit_logs` table (`src/db/schema/audit.js`).

## Usage

Simply call `logAudit` inside any Express route handler:

```js
import { logAudit } from "@/lib/audit.js";

logAudit(req, {
  userId: user.id,
  action: "CREATE_GIG",
  entity: "GIG",
  entityId: gigId,
  details: {
    title: "Web Developer needed",
  },
});
```
