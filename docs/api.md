# API Documentation

## Authentication

Most endpoints require authentication. Use Bearer token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

---

## Password Reset OTP

The password reset flow is OTP-based:

- `POST /api/users/password/forgot` sends a 6-digit OTP to the email address.
- `POST /api/users/password/verify` verifies the OTP and returns a short-lived reset token.
- `POST /api/users/password/reset` sets the new password using that reset token.
- OTPs expire after 5 minutes.
- Requests to send a reset OTP are limited to 3 per email every 24 hours.
- The email uses a branded OTP template and includes the 6-digit code (no reset link in the OTP step).

### POST /api/users/password/forgot

Request a password reset OTP.

**Authentication:** Not required

**Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "If the email exists, an OTP has been sent"
  }
}
```

**Errors:**

- `429 Too Many Requests` — Too many password reset requests for this email. Please try again in 24 hours.

### POST /api/users/password/verify

Verify the 6-digit OTP.

**Authentication:** Not required

**Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "OTP verified successfully",
    "resetToken": "short-lived-reset-token"
  }
}
```

**Errors:**

- `400 Bad Request` — Invalid or expired OTP

### POST /api/users/password/reset

Set the new password using the reset token returned by the verification step.

**Authentication:** Not required

**Body:**

```json
{
  "email": "user@example.com",
  "resetToken": "short-lived-reset-token",
  "newPassword": "new-password-123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Errors:**

- `400 Bad Request` — Invalid or expired reset token
- `400 Bad Request` — Password length validation failed

### POST /api/users/password/set

Set a password for users who signed up with OAuth (e.g., Google) so they can login with email and password later.

**Authentication:** Required ✓

**Body:**

```json
{
  "newPassword": "new-password-123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Password set successfully"
  }
}
```

**Errors:**

- `401 Unauthorized` — User is not authenticated
- `400 Bad Request` — User already has a password set

---

## Email Change OTP

The email change flow is OTP-based and requires the user to be authenticated:

- `POST /api/users/me/email/change/request` requests changing to a new email and sends a 6-digit OTP to the current (old) email.
- `POST /api/users/me/email/change/confirm` verifies the OTP and updates the account email to `newEmail`.
- OTPs expire after 5 minutes.

### POST /api/users/me/email/change/request

Send OTP to the current email before changing to a new email.

**Authentication:** Required ✓

**Body:**

```json
{
  "newEmail": "new-address@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "OTP has been sent to your current email"
  }
}
```

**Errors:**

- `400 Bad Request` — New email must be different from current email
- `400 Bad Request` — Email is already in use

### POST /api/users/me/email/change/confirm

Verify OTP and update the email directly.

**Authentication:** Required ✓

**Body:**

```json
{
  "newEmail": "new-address@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "Osama",
    "email": "new-address@example.com"
  }
}
```

**Errors:**

- `400 Bad Request` — Invalid or expired OTP
- `400 Bad Request` — Email is already in use

---

## Platforms API

### GET /api/v1/platforms

List all platforms.

**Authentication:** Required ✓  
**Response:** Array of platforms

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Upwork",
      "description": "Freelance marketplace",
      "url": "https://upwork.com",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/v1/platforms

Create a new platform.

**Authentication:** Required ✓  
**Body:**

```json
{
  "description": "Platform description",
  "platformUrl": "Optional platform URL",
  "imageUrl": "Optional image URL",
  "youtubeUrl": "Optional YouTube URL",
  "videoUrl": "Optional video URL"
}
```

**Response:** Created platform object

```json
{
  "success": true,
  "data": {
    "id": 1,
    "description": "Platform description",
    "platformUrl": "https://...",
    "imageUrl": "https://...",
    "youtubeUrl": "https://...",
    "videoUrl": "https://..."
  },
  "message": "Platform added successfully"
}
```

---

### PATCH /api/v1/platforms/{id}

Update platform by **id**.

**Authentication:** Required ✓  
**Parameters:**

- `id` (path) — Platform ID (integer)
- `URL` — `/api/v1/platforms/{id}`

**Body:** (at least one field required)

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "url": "https://updated-url.com"
}
```

**Response:** Updated platform object

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Name",
    "description": "Updated description",
    "url": "https://updated-url.com",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

**Errors:**

- `404 Not Found` — Platform with `id` doesn't exist
- `400 Bad Request` — At least one field is required

---

### DELETE /api/v1/platforms/{id}

Delete platform by **id**.

**Authentication:** Required ✓  
**Parameters:**

- `id` (path) — Platform ID (integer)
- `URL` — `/api/v1/platforms/{id}`

**Response:**

```json
{
  "success": true,
  "data": { "success": true }
}
```

**Errors:**

- `404 Not Found` — Platform with `id` doesn't exist

---

## Skills API

### GET /api/v1/skills

Get all skills for the authenticated user.

**Authentication:** Required ✓  
**Response:** Array of user's skills

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "JavaScript",
      "category": {
        "id": 1,
        "name": "Programming"
      }
    }
  ]
}
```

---

### POST /api/v1/skills

Add a skill to the authenticated user (max 50 skills per user).

**Authentication:** Required ✓  
**Body:**

```json
{
  "skillId": 1,
  // OR
  "skillName": "JavaScript"
}
```

**Response:** Added skill object

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "JavaScript",
    "category": {
      "id": 1,
      "name": "Programming"
    }
  }
}
```

**Errors:**

- `400 Bad Request` — Please provide either skillId or skillName
- `409 Conflict` — User already has 50 skills (max limit reached)

---

### PATCH /api/v1/skills/{id}

Replace a skill mapping for the authenticated user.

**Authentication:** Required ✓  
**Parameters:**

- `id` (path) — Skill ID to replace (integer)
- `URL` — `/api/v1/skills/{id}`

**Body:**

```json
{
  "skillId": 2,
  // OR
  "skillName": "Python"
}
```

**Response:** New skill object

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Python",
    "category": {
      "id": 1,
      "name": "Programming"
    }
  }
}
```

**Errors:**

- `400 Bad Request` — Please provide either skillId or skillName

---

### DELETE /api/v1/skills/{id}

Remove a skill from the authenticated user (preserves skill record in database).

**Authentication:** Required ✓  
**Parameters:**

- `id` (path) — Skill ID to remove (integer)
- `URL` — `/api/v1/skills/{id}`

**Response:**

```json
{
  "success": true,
  "data": { "success": true }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Common Error Codes

| Code               | HTTP | Description                                                 |
| ------------------ | ---- | ----------------------------------------------------------- |
| `UNAUTHORIZED`     | 401  | Missing or invalid authentication                           |
| `NOT_FOUND`        | 404  | Resource not found (e.g., platform with `id` doesn't exist) |
| `VALIDATION_ERROR` | 400  | Invalid request body or parameters                          |
| `UNKNOWN_ERROR`    | 500  | Server error                                                |
