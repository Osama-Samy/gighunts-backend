# Database & Schema

## Overview

The platform utilizes **SQLite** (`better-sqlite3`) as the primary database, seamlessly integrated with **Drizzle ORM** for type-safe database access and migrations.

## Configuration

Drizzle is configured in `drizzle.config.js`. The configuration connects to a local SQLite file:

- The database file is typically `data/sqlite.db`, or it can be configured via the `DB_FILE_NAME` environment variable.

## Schema Design

Our Drizzle schema is located in `src/db/schema/`.

Key tables include:

- **`user`, `session`, `account`, `verification`**: Managed by Better Auth.
- **`gigs`**: Stores gig details (id, title, description, status, budget, etc.).
- **`audit_logs`**: Tracks critical actions made across the system.
- **`logs`**: Centralized application and request logs.
- **`feature_flags`**: Manages environment capability toggles.

## Migrations

Migrations are tracked in `src/db/migrations`. Drizzle Kit is used to generate migration files automatically based on changes made in the schema directory.

### Commands

Generate a new migration:

```bash
npm run db:generate
```

Apply migrations locally:

```bash
npm run db:migrate
```

```bash
npm run db:studio
```
