# Testing

## Overview

The application uses **Vitest** for running unit and integration tests.

## Manual Password Reset OTP Test

To test the password reset flow manually:

1. Start the app:

```bash
npm run dev
```

2. Request an OTP:

```bash
curl -X POST http://localhost:3000/api/users/password/forgot \
	-H "Content-Type: application/json" \
	-d "{\"email\":\"user@example.com\"}"
```

3. Check the email inbox. The message contains only a 6-digit OTP.

4. Verify the OTP:

```bash
curl -X POST http://localhost:3000/api/users/password/verify \
	-H "Content-Type: application/json" \
	-d "{\"email\":\"user@example.com\",\"otp\":\"123456\"}"
```

5. Copy the returned `resetToken`.

6. Set the new password using the reset token:

```bash
curl -X POST http://localhost:3000/api/users/password/reset \
	-H "Content-Type: application/json" \
	-d "{\"email\":\"user@example.com\",\"resetToken\":\"short-lived-reset-token\",\"newPassword\":\"new-password-123\"}"
```

Endpoint:

- `POST /api/users/password/reset`

Request body:

```json
{
  "email": "user@example.com",
  "resetToken": "short-lived-reset-token",
  "newPassword": "new-password-123"
}
```

Notes:

- The OTP expires after 5 minutes.
- You can request the OTP 3 times per email per day.
- The email does not include a reset button or reset link.

## Configuration

- Test configuration is located at `vitest.config.js`.
- The environment is set to `node`, with aliases mapped for `@/` -> `./src/`.
- During tests, Vitest automatically sets `NODE_ENV=test`.
- Base environment variables are automatically loaded from `.env.test` by `src/env.js`.
- The test suite uses a dedicated local testing database to prevent conflicts with the dev database (`TEST_DB_URL=local-test.sqlite`).

## Directory Structure

All tests are located in the `test/` directory. For example:

- `test/app.test.js`
- `test/gigs.test.js`

## Database in Tests

To keep tests isolated and avoid affecting development data, Drizzle ORM connects to the testing local database. `drizzle.config.js` can be overridden or mapped appropriately.

Before tests, we wipe all relevant tables to ensure a clean slate. We avoid dropping tables for speed.
This is handled in `test/setup.js` via the `clearDatabase(db)` function:

```js
import { clearDatabase } from "../src/db/index.js";
await clearDatabase(db);
```

It runs `DELETE FROM <tableName>` on tables like `gigs`, `audit_logs`, `logs`, `user`, etc.

## Running Tests

Run the test suite using standard script:

```bash
npm test
```
