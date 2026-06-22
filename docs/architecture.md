# GigHunt — Architecture

## Stack

| Layer      | Tech                    |
| ---------- | ----------------------- |
| Runtime    | Node.js                 |
| Framework  | Express (JavaScript)    |
| ORM        | Drizzle ORM             |
| Database   | SQLite (better-sqlite3) |
| Validation | Zod                     |
| API Spec   | Zod OpenAPI             |
| Auth       | Better Auth             |
| Testing    | Vitest                  |

---

## Architecture Pattern

**Modular Monolith** with a simple layered structure inside each module.

Each domain is a self-contained module with its own routes, handlers, services, validators, and DB queries. Modules communicate only through each other's public facade (`index.ts`). Deep internal imports across modules are forbidden.

### Cross-Module Data Access Rules

1. **Read** — import from the target module's `index.ts` only
2. **Join at DB level** — use Drizzle joins inside the module that owns the response shape
3. **Write across modules** — use a higher-level service or orchestrator; never call another module's write internals directly

---

## Project File Structure

```
gighunt/
├── src/
│   ├── modules/                  # feature modules
│   │   ├── auth/
│   │   │   ├── index.js          # public facade
│   │   │   ├── auth.router.js
│   │   │   ├── auth.handler.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js    # zod schemas & openapi types
│   │   ├── users/
│   │   │   ├── index.js
│   │   │   ├── users.router.js
│   │   │   ├── users.handler.js
│   │   │   ├── users.service.js
│   │   │   ├── users.queries.js  # drizzle queries
│   │   │   └── users.schema.js
│   │   ├── gigs/
│   │   ├── proposals/
│   │   ├── payments/
│   │   └── reviews/
│   │
│   ├── db/
│   │   ├── schema/               # drizzle table definitions (one file per module)
│   │   │   ├── users.js
│   │   │   ├── gigs.js
│   │   │   └── ...
│   │   ├── index.js              # db client
│   │   └── migrations/
│   │
│   ├── lib/
│   │   ├── auth.js               # better-auth instance
│   │   ├── logger.js             # logger utility function
│   │   └── openapi.js            # zod-openapi app wrapper
│   │
│   ├── middleware/               # express middlewares
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── logger.js             # request logging middleware
│   │
│   ├── shared/
│   │   ├── errors.js             # typed error classes
│   │   └── types.js              # shared env/context types
│   │
│   ├── app.js                    # express app, route mounting
│   ├── env.js                    # environment variables zod schema
│   └── index.js                  # node entry point
│
├── docs/
│   └── architecture.md           # this file
│
├── test/
│   └── ...                       # vitest tests, mirroring src structure
│
├── drizzle.config.ts
├── wrangler.toml
├── tsconfig.json
└── package.json
```

---

## Module Internal Layer Order

```
router → handler → service → queries/db
```

- **router** — Express route definitions, OpenAPI spec decorators
- **handler** — request parsing, zod validation, response shaping
- **service** — business logic, orchestration
- **queries** — raw Drizzle queries, no business logic

---

## Users OTP Flows

`users` module contains two OTP-based security flows:

- **Password reset OTP** via `password-reset.service.js`
- **Email change OTP (sent to old email)** via `email-change.service.js`

Both flows persist OTP records in `verification`, hash OTP values before storage, and enforce short expiration windows.

Outgoing OTP emails share a unified branded template from `src/lib/email-templates.js`, and delivery is handled through `src/lib/mailer.js` using Resend.

---

## Naming Conventions

- Files: `<module>.<layer>.js` (e.g. `gigs.service.js`)
- DB schema files live in `db/schema/`, named by module
- Each module's `index.js` re-exports only its public surface
