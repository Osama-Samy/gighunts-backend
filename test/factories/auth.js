import request from "supertest";

import { createApp } from "../../src/app.js";
import { auth } from "../../src/lib/auth.js";
import { createLoggedInUser } from "./users.js";

export async function createAuthApp() {
  const { user: loggedInUser } = await createLoggedInUser();

  const { headers } = await (await auth.$context).test.login({ userId: loggedInUser.id });
  const app = await createApp();
  const agent = request.agent(app);

  agent.set("cookie", headers.get("cookie") ?? ""); 

  return {
    app,
    loggedInUser,
    authApp: agent,
  };
}
