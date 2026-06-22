# Environment Variables

Environment variables are managed and validated using `dotenv` and `zod` in the `src/lib/env.js` file.

## Variables

The following variables are required:

- `BETTER_AUTH_SECRET`: Secret used by Better Auth for signing tokens.
- `BETTER_AUTH_URL`: The base URL for authentication endpoints.
- `NODE_ENV`: The environment the app is running in (`dev`, `production`, `test`). Defaults to `dev`.

Optional variables:

- `GOOGLE_OAUTH_CLIENT_ID`: Enables Google social login when provided with `GOOGLE_OAUTH_CLIENT_SECRET`.
- `GOOGLE_OAUTH_CLIENT_SECRET`: Enables Google social login when provided with `GOOGLE_OAUTH_CLIENT_ID`.
- `RESEND_API_KEY`: Resend API key used by the Resend SDK for transactional emails.
- `MAIL_FROM`: Sender address used for outgoing emails, for example `GigHunts <no-reply@yourdomain.com>`.
- `AI_CV_ANALYZE_URL`: URL for CV analysis service endpoint used to extract skills from uploaded CV PDFs. Defaults to `http://91.99.199.47:8001/analyze`.

## Validation & Parsing

Variables are validated against a Zod schema `EnvSchema` to ensure type safety and that all required values are present at startup.

```js
// src/env.js
export const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1, "Better Auth Secret is required"),
  // ...
});
```

If validation fails, the app logs the missing fields and throws an error, preventing it from starting in an invalid state.

## Usage

You can use the validated `env` export anywhere in your application code.

```javascript
import { env } from "@/env.js";

// Safe, typed access
const secret = env.BETTER_AUTH_SECRET;
```

## Local Setup

1. Copy `.env.example` to `.env` (or `.env.local`).
2. Fill in the values.
3. For testing, `.env.test` and `.env.test.local` are supported.
