import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthApp } from "../../../../test/factories/auth.js";
import { createPlatform } from "../../../../test/factories/platforms.js";
import { createApp } from "../../../app.js";
import { db } from "../../../db/index.js";
import { user } from "../../../db/schema/auth.js";
import { platforms } from "../../../db/schema/platforms.js";

const baseUrl = "/api/v1/platforms";

describe(`GET ${baseUrl}`, () => {
  it("returns all platforms", async () => {
    const { authApp } = await createAuthApp();

    const first = await createPlatform("Upwork");
    const second = await createPlatform("Freelancer");

    const res = await authApp.get(baseUrl).expect(200);

    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, description: "Upwork" }),
        expect.objectContaining({ id: second.id, description: "Freelancer" }),
      ]),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(baseUrl).expect(401);
  });
});

describe(`POST ${baseUrl}`, () => {
  it("creates a platform", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp
      .post(baseUrl)
      .send({
        description: "Toptal",
        platformUrl: "https://www.toptal.com",
      })
      .expect(201);

    expect(res.body.data).toEqual(
      expect.objectContaining({
        description: "Toptal",
        platformUrl: "https://www.toptal.com",
      }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).post(baseUrl).send({ description: "Behance" }).expect(401);
  });
});

describe(`PATCH ${baseUrl}/{id}`, () => {
  it("updates platform fields", async () => {
    const { authApp } = await createAuthApp();
    const platform = await createPlatform("Old Name");

    const res = await authApp
      .patch(`${baseUrl}/${platform.id}`)
      .send({
        description: "New Name",
        platformUrl: "https://example.com",
      })
      .expect(200);

    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: platform.id,
        description: "New Name",
        platformUrl: "https://example.com",
      }),
    );
  });

  it("returns 404 when platform does not exist", async () => {
    const { authApp } = await createAuthApp();

    await authApp.patch(`${baseUrl}/999999`).send({ description: "Nope" }).expect(404);
  });

  it("requires authentication for update", async () => {
    const platform = await createPlatform("Fiverr");
    const app = await createApp();

    await request(app)
      .patch(`${baseUrl}/${platform.id}`)
      .send({ description: "Updated" })
      .expect(401);
  });
});

describe(`DELETE ${baseUrl}/{id}`, () => {
  it("deletes a platform", async () => {
    const { authApp } = await createAuthApp();
    const platform = await createPlatform("To Delete");

    const res = await authApp.delete(`${baseUrl}/${platform.id}`).expect(200);
    expect(res.body.data).toEqual({ success: true });

    const [row] = await db.select().from(platforms).where(eq(platforms.id, platform.id));
    expect(row).toBeUndefined();
  });

  it("returns 404 when platform does not exist", async () => {
    const { authApp } = await createAuthApp();
    await authApp.delete(`${baseUrl}/999999`).expect(404);
  });

  it("requires authentication for delete", async () => {
    const platform = await createPlatform("Dribbble");
    const app = await createApp();

    await request(app).delete(`${baseUrl}/${platform.id}`).expect(401);
  });
});

describe(`PATCH ${baseUrl}/me/filters`, () => {
  it("updates current user platformFilters", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const first = await createPlatform("Upwork");
    const second = await createPlatform("Freelancer");

    const res = await authApp
      .patch(`${baseUrl}/me/filters`)
      .send({ platformIds: [first.id, second.id] })
      .expect(200);

    expect(res.body.data.platformFilters).toEqual([first.id, second.id]);

    const [row] = await db
      .select()
      .from(user)
      .where(eq(user.id, loggedInUser.id));

    expect(row?.platformFilters).toEqual([first.id, second.id]);
  });

  it("returns 400 for invalid platform ids", async () => {
    const { authApp } = await createAuthApp();

    await authApp
      .patch(`${baseUrl}/me/filters`)
      .send({ platformIds: [999999] })
      .expect(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();

    await request(app)
      .patch(`${baseUrl}/me/filters`)
      .send({ platformIds: [1, 2] })
      .expect(401);
  });
});
