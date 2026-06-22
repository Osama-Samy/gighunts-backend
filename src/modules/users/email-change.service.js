import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { verification } from "../../db/schema/auth.js";
import { buildOtpEmailTemplate } from "../../lib/email-templates.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { sendEmail } from "../../lib/mailer.js";
import { UsersQueries } from "./users.queries.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_IDENTIFIER_PREFIX = "email-change-otp";

/** @type {(email: string) => string} */
const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** @type {(otp: string) => string} */
const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/** @type {(userId: string, newEmail: string) => string} */
const getOtpIdentifier = (userId, newEmail) => {
  return `${OTP_IDENTIFIER_PREFIX}:${userId}:${normalizeEmail(newEmail)}`;
};

export const EmailChangeService = {
  /**
   * Send OTP to current (old) email to confirm changing to new email.
   * @param {string} userId
   * @param {string} newEmail
   * @param {string} [context]
   */
  async requestOtp(userId, newEmail, context) {
    const user = await UsersQueries.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found", context);
    }

    const normalizedNewEmail = normalizeEmail(newEmail);
    const normalizedCurrentEmail = normalizeEmail(user.email);

    if (normalizedNewEmail === normalizedCurrentEmail) {
      throw new ValidationError(
        "New email must be different from current email",
        context,
      );
    }

    const existingUser = await UsersQueries.findByEmail(normalizedNewEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new ValidationError("Email is already in use", context);
    }

    const otp = generateOtp();
    const identifier = getOtpIdentifier(user.id, normalizedNewEmail);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await db
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier,
      value: hashOtp(otp),
      expiresAt,
    });

    const { html, text } = buildOtpEmailTemplate({
      title: "Confirm Email Change",
      heading: "Email Change Verification",
      recipientName: user.name || "there",
      intro:
        "Use the verification code below to confirm changing your GigHunts account email.",
      otpCode: otp,
      validFor: "5 minutes",
      note: "If you didn't request this change, keep your account secure and ignore this email.",
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "GigHunts email change verification code",
        text,
        html,
      });
    } catch (_error) {
      await db
        .delete(verification)
        .where(eq(verification.identifier, identifier));
      throw new ValidationError("Failed to send email change OTP", context);
    }

    return {
      message: "OTP has been sent to your current email",
    };
  },

  /**
   * Verify OTP sent to old email and update the email directly.
   * @param {string} userId
   * @param {string} newEmail
   * @param {string} otp
   * @param {string} [context]
   */
  async confirmChange(userId, newEmail, otp, context) {
    const user = await UsersQueries.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found", context);
    }

    const normalizedNewEmail = normalizeEmail(newEmail);
    const normalizedCurrentEmail = normalizeEmail(user.email);

    if (normalizedNewEmail === normalizedCurrentEmail) {
      throw new ValidationError(
        "New email must be different from current email",
        context,
      );
    }

    const existingUser = await UsersQueries.findByEmail(normalizedNewEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new ValidationError("Email is already in use", context);
    }

    const identifier = getOtpIdentifier(user.id, normalizedNewEmail);

    const [otpRow] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, identifier));

    if (
      !otpRow ||
      otpRow.expiresAt < new Date() ||
      otpRow.value !== hashOtp(otp)
    ) {
      throw new ValidationError("Invalid or expired OTP", context);
    }

    await db
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    const updatedUser = await UsersQueries.updateUserEmailById(user.id, {
      email: normalizedNewEmail,
      emailVerified: true,
    });

    if (!updatedUser) {
      throw new NotFoundError("User not found", context);
    }

    return updatedUser;
  },
};
