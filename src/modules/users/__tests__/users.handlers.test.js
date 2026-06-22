import { eq } from "drizzle-orm";
import { readdir } from "fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthApp } from "../../../../test/factories/auth.js";
import { createUserWithAccount } from "../../../../test/factories/users.js";
import { createApp } from "../../../app.js";
import { db } from "../../../db/index.js";
import { account, user, verification } from "../../../db/schema/auth.js";
import { env } from "../../../lib/env.js";

const baseUrl = "/api/users";

describe(`GET ${baseUrl}/me`, () => {
  it("returns the current user when authenticated", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const res = await authApp.get(`${baseUrl}/me`).expect(200);

    expect(res.body.data).toMatchObject({
      id: loggedInUser.id,
      name: loggedInUser.name,
      email: loggedInUser.email,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(`${baseUrl}/me`).expect(401);
  });
});

describe(`PATCH ${baseUrl}/me`, () => {
  it("updates and returns the user", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const res = await authApp
      .patch(`${baseUrl}/me`)
      .send({ name: "After", email: loggedInUser.email })
      .expect(200);

    expect(res.body.data.name).toBe("After");
  });

  it("persists the change to the database", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    await authApp
      .patch(`${baseUrl}/me`)
      .send({ name: "Persisted", email: loggedInUser.email })
      .expect(200);

    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.id, loggedInUser.id));

    if (!row) {
      throw new Error("User not found");
    }

    expect(row.name).toBe("Persisted");
  });

  it("returns 400/422 on invalid body", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp
      .patch(`${baseUrl}/me`)
      .send({ name: "name", email: "not-an-email" });

    expect([400, 422]).toContain(res.status);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).patch(`${baseUrl}/me`).send({ name: "X" }).expect(401);
  });
});

describe(`POST ${baseUrl}/me/email/change/request`, () => {
  it("stores a 5-minute OTP for the requested new email and user", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const newEmail = `new-${Date.now()}@example.com`;

    const res = await authApp
      .post(`${baseUrl}/me/email/change/request`)
      .send({ newEmail })
      .expect(200);

    expect(res.body.data.message).toMatch(/otp has been sent/i);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `email-change-otp:${loggedInUser.id}:${newEmail.toLowerCase()}`,
        ),
      );

    if (!otpRow) {
      throw new Error("Email change OTP row not found");
    }

    expect(otpRow.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      4.5 * 60 * 1000,
    );
    expect(otpRow.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      5 * 60 * 1000 + 5000,
    );
  });
});

describe(`POST ${baseUrl}/me/email/change/confirm`, () => {
  it("rejects an invalid OTP", async () => {
    const { authApp } = await createAuthApp();
    const newEmail = `new-${Date.now()}@example.com`;

    await authApp
      .post(`${baseUrl}/me/email/change/request`)
      .send({ newEmail })
      .expect(200);

    await authApp
      .post(`${baseUrl}/me/email/change/confirm`)
      .send({ newEmail, otp: "000000" })
      .expect(400);
  });

  it("updates email after valid OTP", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const newEmail = `verify-${Date.now()}@example.com`;

    await authApp
      .post(`${baseUrl}/me/email/change/request`)
      .send({ newEmail })
      .expect(200);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `email-change-otp:${loggedInUser.id}:${newEmail.toLowerCase()}`,
        ),
      );

    if (!otpRow) {
      throw new Error("Email change OTP row not found");
    }

    const otp = "123456";
    await db
      .update(verification)
      .set({ value: crypto.createHash("sha256").update(otp).digest("hex") })
      .where(eq(verification.id, otpRow.id));

    const res = await authApp
      .post(`${baseUrl}/me/email/change/confirm`)
      .send({ newEmail, otp })
      .expect(200);

    expect(res.body.data.email).toBe(newEmail.toLowerCase());

    const [updatedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, loggedInUser.id));

    if (!updatedUser) {
      throw new Error("Updated user not found");
    }

    expect(updatedUser.email).toBe(newEmail.toLowerCase());

    const [deletedOtpRow] = await db
      .select()
      .from(verification)
      .where(eq(verification.id, otpRow.id));

    expect(deletedOtpRow).toBeUndefined();
  });
});

describe(`POST ${baseUrl}/me/avatar`, () => {
  it("uploads an avatar and returns the updated user", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp
      .post(`${baseUrl}/me/avatar`)
      .attach("avatar", Buffer.from("fake-image"), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      })
      .expect(200);

    expect(res.body.data.image).toBeTruthy();
  });

  it("actually writes a file to the uploads directory", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp
      .post(`${baseUrl}/me/avatar`)
      .attach("avatar", Buffer.from("fake-image"), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      })
      .expect(200);

    const avatarDir = path.join(env.UPLOADS_DIR, "avatars");

    const files = await readdir(avatarDir);
    expect(files.length).toBeGreaterThan(0);

    if (!files[0]) {
      throw new Error("No file found");
    }

    expect(res.body.data.image).toBe(path.join(avatarDir, files[0]));
  });

  it("returns 400 when no file is attached", async () => {
    const { authApp } = await createAuthApp();

    await authApp.post(`${baseUrl}/me/avatar`).expect(400);
  });

  it("returns 400 for files exceeding 2MB", async () => {
    const { authApp } = await createAuthApp();
    const tooBig = Buffer.alloc(3 * 1024 * 1024);

    await authApp
      .post(`${baseUrl}/me/avatar`)
      .attach("avatar", tooBig, {
        filename: "big.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);
  });

  it("returns 400 for disallowed MIME types", async () => {
    const { authApp } = await createAuthApp();

    await authApp
      .post(`${baseUrl}/me/avatar`)
      .attach("avatar", Buffer.from("%PDF-fake"), {
        filename: "file.pdf",
        contentType: "application/pdf",
      })
      .expect(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).post(`${baseUrl}/me/avatar`).expect(401);
  });
});

describe(`POST ${baseUrl}/password/forgot`, () => {
  it("stores a 5-minute OTP for an existing user", async () => {
    const { user: createdUser } = await createUserWithAccount();
    const app = await createApp();

    const res = await request(app)
      .post(`${baseUrl}/password/forgot`)
      .send({ email: createdUser.email })
      .expect(200);

    expect(res.body.data.message).toMatch(/otp has been sent/i);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `password-reset-otp:${createdUser.email.toLowerCase()}`,
        ),
      );

    if (!otpRow) {
      throw new Error("OTP row not found");
    }

    expect(otpRow.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      4.5 * 60 * 1000,
    );
    expect(otpRow.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      5 * 60 * 1000 + 5000,
    );
  });
});

describe(`POST ${baseUrl}/password/verify`, () => {
  it("rejects an invalid OTP", async () => {
    const { user: createdUser } = await createUserWithAccount();
    const app = await createApp();

    await request(app)
      .post(`${baseUrl}/password/verify`)
      .send({
        email: createdUser.email,
        otp: "000000",
      })
      .expect(400);
  });

  it("returns a reset token after a valid OTP", async () => {
    const { user: createdUser } = await createUserWithAccount();
    const app = await createApp();

    await request(app)
      .post(`${baseUrl}/password/forgot`)
      .send({ email: createdUser.email })
      .expect(200);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `password-reset-otp:${createdUser.email.toLowerCase()}`,
        ),
      );

    if (!otpRow) {
      throw new Error("OTP row not found");
    }

    const otp = "123456";
    await db
      .update(verification)
      .set({ value: crypto.createHash("sha256").update(otp).digest("hex") })
      .where(eq(verification.id, otpRow.id));

    const res = await request(app)
      .post(`${baseUrl}/password/verify`)
      .send({ email: createdUser.email, otp })
      .expect(200);

    expect(res.body.data.message).toMatch(/otp verified successfully/i);
    expect(res.body.data.resetToken).toEqual(expect.any(String));

    const [deletedOtpRow] = await db
      .select()
      .from(verification)
      .where(eq(verification.id, otpRow.id));

    expect(deletedOtpRow).toBeUndefined();
  });
});

describe(`POST ${baseUrl}/password/reset`, () => {
  it("rejects an invalid reset token", async () => {
    const { user: createdUser } = await createUserWithAccount();
    const app = await createApp();

    await request(app)
      .post(`${baseUrl}/password/reset`)
      .send({
        email: createdUser.email,
        resetToken: "invalid-token",
        newPassword: "new-password-123",
      })
      .expect(400);
  });

  it("updates the credential password after OTP verification", async () => {
    const { user: createdUser, account: createdAccount } =
      await createUserWithAccount({}, { password: "old-password" });
    const app = await createApp();

    await request(app)
      .post(`${baseUrl}/password/forgot`)
      .send({ email: createdUser.email })
      .expect(200);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `password-reset-otp:${createdUser.email.toLowerCase()}`,
        ),
      );

    if (!otpRow) {
      throw new Error("OTP row not found");
    }

    const otp = "123456";
    await db
      .update(verification)
      .set({ value: crypto.createHash("sha256").update(otp).digest("hex") })
      .where(eq(verification.id, otpRow.id));

    const verifyRes = await request(app)
      .post(`${baseUrl}/password/verify`)
      .send({ email: createdUser.email, otp })
      .expect(200);

    const resetToken = verifyRes.body.data.resetToken;

    await request(app)
      .post(`${baseUrl}/password/reset`)
      .send({
        email: createdUser.email,
        resetToken,
        newPassword: "new-password-123",
      })
      .expect(200);

    const [accountRow] = await db
      .select()
      .from(account)
      .where(eq(account.id, createdAccount.id));

    if (!accountRow) {
      throw new Error("Account not found");
    }

    expect(accountRow.password).toBeTruthy();
    expect(accountRow.password).not.toBe(createdAccount.password);

    const [deletedOtpRow] = await db
      .select()
      .from(verification)
      .where(
        eq(
          verification.identifier,
          `password-reset-token:${createdUser.email.toLowerCase()}`,
        ),
      );

    expect(deletedOtpRow).toBeUndefined();
  });
});

describe(`DELETE ${baseUrl}/me`, () => {
  it("returns { success: true }", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp.delete(`${baseUrl}/me`).expect(200);
    expect(res.body.data).toEqual({ success: true });
  });

  it("marks the user inactive in the database", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    await authApp.delete(`${baseUrl}/me`).expect(200);

    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.id, loggedInUser.id));
    if (!row) {
      throw new Error("soft deleted user not in database");
    }
    expect(row.isActive).toBe(false);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).delete(`${baseUrl}/me`).expect(401);
  });
});
