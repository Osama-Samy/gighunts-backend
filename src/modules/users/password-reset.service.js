import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { account, verification } from "../../db/schema/auth.js";
import { db } from "../../db/index.js";
import { buildOtpEmailTemplate } from "../../lib/email-templates.js";
import { auth } from "../../lib/auth.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { sendEmail } from "../../lib/mailer.js";
import { UsersQueries } from "./users.queries.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const OTP_IDENTIFIER_PREFIX = "password-reset-otp";
const RESET_TOKEN_IDENTIFIER_PREFIX = "password-reset-token";

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

/** @type {(email: string) => string} */
const getOtpIdentifier = (email) => {
  return `${OTP_IDENTIFIER_PREFIX}:${normalizeEmail(email)}`;
};

/** @type {(email: string) => string} */
const getResetTokenIdentifier = (email) => {
  return `${RESET_TOKEN_IDENTIFIER_PREFIX}:${normalizeEmail(email)}`;
};

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** @type {(token: string) => string} */
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const PasswordResetService = {
  /**
   * Send a 6-digit OTP to the user's email.
   * @param {string} email
   * @param {string} [context]
   */
  async requestOtp(email, context) {
    const normalizedEmail = normalizeEmail(email);
    const user = await UsersQueries.findByEmail(normalizedEmail);

    if (!user) {
      return {
        message: "If the email exists, an OTP has been sent",
      };
    }

    const otp = generateOtp();
    const identifier = getOtpIdentifier(normalizedEmail);
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
      title: "Reset Your Password",
      heading: "Password Reset Verification",
      recipientName: user.name || "there",
      intro:
        "Use the verification code below to continue resetting your GigHunts password.",
      otpCode: otp,
      validFor: "5 minutes",
      note: "If you didn't request a password reset, no further action is needed.",
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "Your GigHunts password reset code",
        text,
        html,
      });
    } catch (_error) {
      await db
        .delete(verification)
        .where(eq(verification.identifier, identifier));
      throw new ValidationError("Failed to send reset OTP email", context);
    }

    return {
      message: "If the email exists, an OTP has been sent",
    };
  },

  /**
   * Verify the OTP and return a short-lived reset token.
   * @param {string} email
   * @param {string} otp
   * @param {string} [context]
   */
  async verifyOtp(email, otp, context) {
    const normalizedEmail = normalizeEmail(email);
    const identifier = getOtpIdentifier(normalizedEmail);
    const resetTokenIdentifier = getResetTokenIdentifier(normalizedEmail);
    const user = await UsersQueries.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundError("User not found", context);
    }

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

    const resetToken = generateResetToken();
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db
      .delete(verification)
      .where(eq(verification.identifier, resetTokenIdentifier));
    await db
      .delete(verification)
      .where(eq(verification.identifier, identifier));
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: resetTokenIdentifier,
      value: hashResetToken(resetToken),
      expiresAt: resetTokenExpiresAt,
    });

    return {
      message: "OTP verified successfully",
      resetToken,
    };
  },

  /**
   * Reset the password using a reset token.
   * @param {string} email
   * @param {string} resetToken
   * @param {string} newPassword
   * @param {string} [context]
   */
  async resetPassword(email, resetToken, newPassword, context) {
    const normalizedEmail = normalizeEmail(email);
    const tokenIdentifier = getResetTokenIdentifier(normalizedEmail);
    const user = await UsersQueries.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundError("User not found", context);
    }

    const [tokenRow] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, tokenIdentifier));

    if (
      !tokenRow ||
      tokenRow.expiresAt < new Date() ||
      tokenRow.value !== hashResetToken(resetToken)
    ) {
      throw new ValidationError("Invalid or expired reset token", context);
    }

    const authContext = await auth.$context;
    const minPasswordLength =
      authContext.password.config?.minPasswordLength ?? 8;
    const maxPasswordLength =
      authContext.password.config?.maxPasswordLength ?? 128;

    if (newPassword.length < minPasswordLength) {
      throw new ValidationError(
        `Password must be at least ${minPasswordLength} characters`,
        context,
      );
    }

    if (newPassword.length > maxPasswordLength) {
      throw new ValidationError(
        `Password must be at most ${maxPasswordLength} characters`,
        context,
      );
    }

    const hashedPassword = await authContext.password.hash(newPassword);

    const [existingAccount] = await db
      .select()
      .from(account)
      .where(
        and(eq(account.userId, user.id), eq(account.providerId, "credential")),
      );

    if (!existingAccount) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
      });
    } else {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(account.userId, user.id),
            eq(account.providerId, "credential"),
          ),
        );
    }

    await db
      .delete(verification)
      .where(eq(verification.identifier, tokenIdentifier));

    return {
      message: "Password updated successfully",
    };
  },
};
