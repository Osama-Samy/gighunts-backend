import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthApp } from "../../../../test/factories/auth.js";
import { bookmarkUserGig, createGig, trackUserGig } from "../../../../test/factories/gigs.js";
import { createPlatform } from "../../../../test/factories/platforms.js";
import { createApp } from "../../../app.js";
import { db } from "../../../db/index.js";
import { userBookmarks } from "../../../db/schema/user-bookmarks.js";
import { userGigs } from "../../../db/schema/user-gigs.js";
import { basePath } from "../gigs.handler.js";
import { USER_GIG_STATUS } from "../user-gig-status.js";

const baseUrl = `/api/${basePath}`;

describe(`GET ${baseUrl}`, () => {
  it("returns paginated gigs", async () => {
    const { authApp } = await createAuthApp();

    await createGig({ title: "Alice" });
    await createGig({ title: "Bob" });

    const res = await authApp.get(baseUrl).expect(200);

    expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it("filters by search term", async () => {
    const { authApp } = await createAuthApp();

    await createGig({ title: "Searching for gold" });
    await createGig({ title: "Boring task" });

    const res = await authApp.get(baseUrl).query({ search: "gold" }).expect(200);

    expect(
      res.body.data.data.every((/** @type {any} */ g) => g.title.toLowerCase().includes("gold")),
    ).toBe(true);
    expect(res.body.data.data.length).toBe(1);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(baseUrl).expect(401);
  });
});

describe(`GET ${baseUrl}/bookmarks`, () => {
  it("returns paginated bookmarked gigs", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const gig1 = await createGig({ title: "Bookmarked Gig 1" });
    const gig2 = await createGig({ title: "Bookmarked Gig 2" });
    const gig3 = await createGig({ title: "Not Bookmarked" });

    await bookmarkUserGig(loggedInUser.id, gig1.id);
    await bookmarkUserGig(loggedInUser.id, gig2.id);

    const res = await authApp.get(`${baseUrl}/bookmarks`).expect(200);

    expect(res.body.data.data.length).toBe(2);
    expect(res.body.data.data.some((/** @type {any} */ r) => r.gig.id === gig1.id)).toBe(true);
    expect(res.body.data.data.some((/** @type {any} */ r) => r.gig.id === gig2.id)).toBe(true);
    expect(res.body.data.data.some((/** @type {any} */ r) => r.gig.id === gig3.id)).toBe(false);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it("filters bookmarked gigs by search term", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const gig1 = await createGig({ title: "Frontend Developer" });
    const gig2 = await createGig({ title: "Backend Developer" });

    await bookmarkUserGig(loggedInUser.id, gig1.id);
    await bookmarkUserGig(loggedInUser.id, gig2.id);

    const res = await authApp.get(`${baseUrl}/bookmarks`).query({ search: "Frontend" }).expect(200);

    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].gig.title).toBe("Frontend Developer");
  });

  it("filters bookmarked gigs by category", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const gig1 = await createGig({ title: "Gig 1", category: "Web" });
    const gig2 = await createGig({ title: "Gig 2", category: "Mobile" });

    await bookmarkUserGig(loggedInUser.id, gig1.id);
    await bookmarkUserGig(loggedInUser.id, gig2.id);

    const res = await authApp.get(`${baseUrl}/bookmarks`).query({ category: "Web" }).expect(200);

    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].gig.category).toBe("Web");
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(`${baseUrl}/bookmarks`).expect(401);
  });
});

describe(`GET ${baseUrl}/:id`, () => {
  it("returns single gig details", async () => {
    const { authApp } = await createAuthApp();

    const platform = await createPlatform("Upwork");
    const gig = await createGig({ platformId: platform.id });

    const res = await authApp.get(`${baseUrl}/${gig.id}`).expect(200);

    expect(res.body.data.id).toBe(gig.id);
    expect(res.body.data.platform.description).toBe("Upwork");
  });

  it("returns 404 for non-existent gig", async () => {
    const { authApp } = await createAuthApp();
    await authApp.get(`${baseUrl}/99999`).expect(404);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(`${baseUrl}/1`).expect(401);
  });
});

describe(`POST ${baseUrl}/:id/bookmark`, () => {
  it("toggles bookmark for authenticated user", async () => {
    const { authApp } = await createAuthApp();
    const gig = await createGig();

    // 1. First toggle (adds)
    const res1 = await authApp.post(`${baseUrl}/${gig.id}/bookmark`).expect(200);
    expect(res1.body.data.bookmarked).toBe(true);

    const check1 = await db.select().from(userBookmarks).where(eq(userBookmarks.gigId, gig.id));
    expect(check1.length).toBe(1);

    // 2. Second toggle (removes)
    const res2 = await authApp.post(`${baseUrl}/${gig.id}/bookmark`).expect(200);
    expect(res2.body.data.bookmarked).toBe(false);

    const check2 = await db.select().from(userBookmarks).where(eq(userBookmarks.gigId, gig.id));
    expect(check2.length).toBe(0);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    const gig = await createGig();
    await request(app).post(`${baseUrl}/${gig.id}/bookmark`).expect(401);
  });
});

describe(`POST ${baseUrl}/:id/track`, () => {
  it("adds gig to user_gigs as pending", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const gig = await createGig();

    const res = await authApp.post(`${baseUrl}/${gig.id}/track`).expect(200);
    expect(res.body.data.gigId).toBe(gig.id);
    expect(res.body.data.status).toBe(USER_GIG_STATUS.PENDING);

    const [row] = await db.select().from(userGigs).where(eq(userGigs.userId, loggedInUser.id));
    if (!row) {
      throw new Error("Failed to track gig");
    }
    expect(row.gigId).toBe(gig.id);
  });

  it("returns 409 if already tracked", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const gig = await createGig();
    await trackUserGig(loggedInUser.id, gig.id);

    await authApp.post(`${baseUrl}/${gig.id}/track`).expect(409);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    const gig = await createGig();
    await request(app).post(`${baseUrl}/${gig.id}/track`).expect(401);
  });
});

describe(`GET ${baseUrl}/me`, () => {
  it("returns user tracked gigs", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const gig = await createGig({ title: "My Special Gig" });
    await trackUserGig(loggedInUser.id, gig.id);

    const res = await authApp.get(`${baseUrl}/me`).expect(200);

    expect(
      res.body.data.data.some((/** @type {any} */ row) => row.gig.title === "My Special Gig"),
    ).toBe(true);
  });
});

describe(`PATCH ${baseUrl}/me/:id`, () => {
  it("updates gig status", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const gig = await createGig();
    await trackUserGig(loggedInUser.id, gig.id, USER_GIG_STATUS.PENDING);

    const res = await authApp
      .patch(`${baseUrl}/me/${gig.id}`)
      .send({ status: USER_GIG_STATUS.ACTIVE })
      .expect(200);

    expect(res.body.data.status).toBe(USER_GIG_STATUS.ACTIVE);
  });
});

describe(`DELETE ${baseUrl}/me/:id`, () => {
  it("sets user gig status to CLOSED", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const gig = await createGig();
    await trackUserGig(loggedInUser.id, gig.id, USER_GIG_STATUS.ACTIVE);

    const res = await authApp.delete(`${baseUrl}/me/${gig.id}`).expect(200);
    expect(res.body.data.status).toBe(USER_GIG_STATUS.CLOSED);
  });
});
