import { Resend } from "resend";
import { env } from "./env.js";

/** @type {import("resend").Resend | null} */
let resendClient = null;

function getFromAddress() {
  return env.MAIL_FROM?.trim() || "GigHunts <no-reply@example.com>";
}

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is required to send emails in production",
      );
    }

    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} mail
 */
export async function sendEmail(mail) {
  const client = getResendClient();
  const payload = {
    from: getFromAddress(),
    ...mail,
  };

  if (!client) {
    if (env.NODE_ENV !== "test") {
      console.info(
        "[mailer] RESEND_API_KEY is not set, skipping email send",
        payload,
      );
    }

    return {
      id: "dev-email-skipped",
    };
  }

  const { data, error } = await client.emails.send(payload);

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return data;
}
