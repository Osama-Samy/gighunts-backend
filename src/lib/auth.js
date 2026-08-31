import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { openAPI, testUtils } from "better-auth/plugins";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { buildOtpEmailTemplate } from "./email-templates.js";
import { env } from "./env.js";
import { sendEmail } from "./mailer.js";

export function createAuth() {
  const hasGoogleOAuth =
    Boolean(env.GOOGLE_OAUTH_CLIENT_ID?.trim()) && Boolean(env.GOOGLE_OAUTH_CLIENT_SECRET?.trim());

  return betterAuth({
    appName: "Gighunts",
    plugins: [
      openAPI(),
      inferAdditionalFields({ user: userAdditionalFields }),
      ...(env.NODE_ENV === "test" ? [testUtils({ captureOTP: true })] : []),
    ],
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),


    // emailVerification: {
    //   sendVerificationEmail: async ({ user, url, token }) => {
    //     await sendEmail({
    //       to: user.email,
    //       subject: "Verify your Gig Hunt email address",
    //       text: `Hello,\n\nThank you for joining Gig Hunt. Please use the verification code below to confirm your email address:\n\n${token}\n\nYou can also verify your email here: ${url}\n\nIf you did not create this account, you can safely ignore this email.\n\nBest regards,\nGig Hunt Team`,
    //       html: `
    //         <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px">
    //           <h2 style="margin: 0 0 16px; font-size: 24px;">Verify your email address</h2>
    //           <p style="margin: 0 0 16px;">Thank you for joining Gig Hunt. Use the verification code below to confirm your email address:</p>
    //           <div style="margin: 24px 0; padding: 16px 20px; background: #f3f4f6; border-radius: 12px; text-align: center;">
    //             <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">Verification code</div>
    //             <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${token}</div>
    //           </div>
    //           <p style="margin: 0 0 20px;">Or verify instantly using the link below:</p>
    //           <p style="margin: 0 0 24px;"><a href="${url}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">Verify Email</a></p>
    //           <p style="margin: 0; color: #6b7280; font-size: 14px;">If you did not create this account, you can safely ignore this email.</p>
    //         </div>
    //       `,
    //     });
    //   },
    // },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async (ctx) => {
        const { user, token } = ctx;
        const { html, text } = buildOtpEmailTemplate({
          title: "Reset Your Password",
          heading: "Password Reset Verification",
          recipientName: user.name || "there",
          intro: "Use the verification code below to continue resetting your GigHunts password.",
          otpCode: token,
          validFor: "5 minutes",
          note: "If you didn't request a password reset, no further action is needed.",
        });

        await sendEmail({
          to: user.email,
          subject: "Your GigHunts password reset code",
          text,
          html,
        });
      },
      onPasswordReset: async ({ user }) => {
        console.log(`Password for user ${user.email} has been reset.`);
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.FRONT_END_URL],
    ...(env.NODE_ENV === "dev" ? {
      advanced:
      {
        defaultCookieAttributes: { sameSite: "none", secure: true, },
      },
    } : {}),
    ...(hasGoogleOAuth
      ? {
        socialProviders: {
          google: {
            prompt: "select_account",
            clientId: String(env.GOOGLE_OAUTH_CLIENT_ID),
            clientSecret: String(env.GOOGLE_OAUTH_CLIENT_SECRET),
          },
        },
      }
      : {}),
    user: {
      additionalFields: userAdditionalFields,
    },
  });
}

/**
 * @type {{ [key: string]: import("better-auth").DBFieldAttribute & { default?: any } }}
 * */
const userAdditionalFields = {
  darkMode: {
    type: "boolean",
    default: false,
    fieldName: "dark_mode",
  },
  appNotifications: {
    type: "boolean",
    default: true,
    fieldName: "app_notifications",
  },
  emailNotifications: {
    type: "boolean",
    default: true,
    fieldName: "email_notifications",
  },
  language: {
    type: "string",
    default: "en",
    fieldName: "language",
  },
  inAppBrowser: {
    type: "boolean",
    default: true,
    fieldName: "in_app_browser",
  },
  platformFilters: {
    type: "json",
    default: "[]",
    fieldName: "platform_filters",
  },
  phone: {
    type: "string",
    fieldName: "phone",
  },
  cv: {
    type: "string",
    fieldName: "cv",
  },
  cvLink: {
    type: "string",
    fieldName: "cv_link",
  },
};

export const auth = createAuth();
