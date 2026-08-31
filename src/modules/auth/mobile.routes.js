import { Router } from "express";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { auth } from "../../lib/auth.js";
import { env } from "../../lib/env.js";
import { db } from "../../db/index.js";
import { user, account } from "../../db/schema/auth.js";
import { UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { registry } from "../../lib/registry.js";
import z from "zod";

export const mobileAuthRouter = Router();

registry.registerPath({
  method: "post",
  path: "/auth/mobile/google",
  tags: ["Auth"],
  summary: "Mobile Google Sign-In",
  description: "Authenticates a user via Google id_token from a mobile app and returns a session token.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            id_token: z.string().openapi({ description: "Google ID Token from mobile client" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully authenticated",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            user: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
              image: z.string().nullable().optional(),
            }),
            token: z.string().openapi({ description: "Session Bearer Token for Authorization header" }),
          }),
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
  },
});

mobileAuthRouter.post("/mobile/google", async (req, res, next) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      throw new ValidationError("id_token is required");
    }

    // 1. Verify id_token using Google's tokeninfo API
    let payload;
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);
      if (!response.ok) {
        throw new UnauthorizedError("Invalid or expired id_token");
      }
      payload = await response.json();
      
      // Validate audience matches our Client ID
      if (payload.aud !== env.GOOGLE_OAUTH_CLIENT_ID) {
        throw new UnauthorizedError("Invalid token audience");
      }
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired id_token");
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email) {
      throw new ValidationError("Email not provided in google token");
    }

    // 2. Find or create user in the database
    let existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!existingUser) {
      // Create a new user
      const userId = crypto.randomUUID();
      [existingUser] = await db.insert(user).values({
        id: userId,
        email: email,
        name: name || email.split("@")[0],
        image: picture,
        emailVerified: email_verified ?? true,
        isActive: true,
      }).returning();

      // Create a linked account for Google
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: googleId,
        providerId: "google",
        userId: userId,
      });
    } else {
      // Existing user — verify active status
      if (!existingUser.isActive) {
        throw new UnauthorizedError("User account is inactive");
      }

      // Link Google account if not already linked
      const existingAccount = await db.query.account.findFirst({
        where: and(
          eq(account.accountId, googleId),
          eq(account.providerId, "google")
        ),
      });

      if (!existingAccount) {
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: googleId,
          providerId: "google",
          userId: existingUser.id,
        });
      }
    }

    // 3. Create Session programmatically using better-auth core API
    const authContext = await auth.$context;
    
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.socket?.remoteAddress || "";
    
    // Using internalAdapter to manually create a session, this simulates what better-auth does internally
    const sessionData = await authContext.internalAdapter.createSession(
      existingUser.id,
      false, // dontRememberMe
      {
        userAgent,
        ipAddress
      }
    );

    // Return the session token directly in the JSON response
    // The mobile app can save this token and use it as a Bearer Token in the Authorization header
    res.json({
      success: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        image: existingUser.image,
      },
      token: sessionData.token, 
    });
  } catch (error) {
    next(error);
  }
});
