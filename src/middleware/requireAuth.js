import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { UserService } from "../modules/users/users.service.js";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */

export async function requireAuth(req, res, next) {
  const publicPaths = [
    "/users/password/forgot",
    "/users/password/verify",
    "/users/password/reset",
];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const headers = fromNodeHeaders(req.headers);
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ") && !headers.get("cookie")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      headers.set("cookie", `better-auth.session_token=${token}`);
    }
  }

  const session = await auth.api.getSession({
    headers,
  });

  if (!session) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "You are not authorized to access this resource",
      type: "https://example.com/probs/unauthorized",
      title: "Unauthorized",
      instance: req.path,
    });
  }

  const userId = session.user.id;
  const user = await UserService.getUserById(userId, req.originalUrl);

  if (!user || !user.isActive) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User is not found or Inactive",
      type: "https://example.com/probs/unauthorized",
      title: "Unauthorized",
      instance: req.path,
    });
  }

  req.user = user; // attach user to request
  req.session = session.session; // attach session to request
  return next();
}
