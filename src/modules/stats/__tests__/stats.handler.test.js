import { and, eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthApp } from "../../../../test/factories/auth.js";
import { createGig, trackUserGig } from "../../../../test/factories/gigs.js";
import { createPlatform } from "../../../../test/factories/platforms.js";
import { createApp } from "../../../app.js";
import { db } from "../../../db/index.js";
import { userPlatformRatings } from "../../../db/schema/user-platform-ratings.js";
import { USER_GIG_STATUS } from "../../gigs/user-gig-status.js";
import { basePath } from "../stats.handler.js";

const baseUrl = `/api/${basePath}`;

describe(`GET ${baseUrl}/gigs`, () => {
  it("returns current user gigs stats and successRate", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const pendingGig = await createGig({ title: "pending gig" });
    const closedGig = await createGig({ title: "closed gig" });
    const completedGig1 = await createGig({ title: "completed gig 1" });
    const completedGig2 = await createGig({ title: "completed gig 2" });
    const activeGig = await createGig({ title: "active gig" });

    await trackUserGig(loggedInUser.id, pendingGig.id, USER_GIG_STATUS.PENDING);
    await trackUserGig(loggedInUser.id, closedGig.id, USER_GIG_STATUS.CLOSED);
    await trackUserGig(loggedInUser.id, completedGig1.id, USER_GIG_STATUS.COMPLETED);
    await trackUserGig(loggedInUser.id, completedGig2.id, USER_GIG_STATUS.COMPLETED);
    await trackUserGig(loggedInUser.id, activeGig.id, USER_GIG_STATUS.ACTIVE);

    const res = await authApp.get(`${baseUrl}/gigs`).expect(200);

    expect(res.body.data.totalGigs).toBe(5);
    expect(res.body.data.pending).toBe(1);
    expect(res.body.data.closed).toBe(1);
    expect(res.body.data.completed).toBe(2);
    expect(res.body.data.successRate).toBe(66.67);
  });

  it("returns zero stats when user has no gigs", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp.get(`${baseUrl}/gigs`).expect(200);

    expect(res.body.data.totalGigs).toBe(0);
    expect(res.body.data.pending).toBe(0);
    expect(res.body.data.closed).toBe(0);
    expect(res.body.data.completed).toBe(0);
    expect(res.body.data.successRate).toBe(0);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(`${baseUrl}/gigs`).expect(401);
  });
});

describe(`GET ${baseUrl}/platforms/success-rate`, () => {
  it("returns success rate per platform for current user and stores it", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const upwork = await createPlatform("Upwork");
    const fiverr = await createPlatform("Fiverr");
    const freelancer = await createPlatform("Freelancer");

    const upworkClosed = await createGig({ platformId: upwork.id });
    const upworkCompleted1 = await createGig({ platformId: upwork.id });
    const upworkCompleted2 = await createGig({ platformId: upwork.id });
    const fiverrClosed = await createGig({ platformId: fiverr.id });
    const fiverrCompleted = await createGig({ platformId: fiverr.id });

    await trackUserGig(loggedInUser.id, upworkClosed.id, USER_GIG_STATUS.CLOSED);
    await trackUserGig(loggedInUser.id, upworkCompleted1.id, USER_GIG_STATUS.COMPLETED);
    await trackUserGig(loggedInUser.id, upworkCompleted2.id, USER_GIG_STATUS.COMPLETED);
    await trackUserGig(loggedInUser.id, fiverrClosed.id, USER_GIG_STATUS.CLOSED);
    await trackUserGig(loggedInUser.id, fiverrCompleted.id, USER_GIG_STATUS.COMPLETED);

    const res = await authApp.get(`${baseUrl}/platforms/success-rate`).expect(200);

    expect(res.body.data).toEqual(
      expect.arrayContaining([
        {
          platformId: upwork.id,
          platformName: "Upwork",
          successRate: 66.67,
        },
        {
          platformId: fiverr.id,
          platformName: "Fiverr",
          successRate: 50,
        },
        {
          platformId: freelancer.id,
          platformName: "Freelancer",
          successRate: 0,
        },
      ]),
    );

    const [upworkRating] = await db
      .select()
      .from(userPlatformRatings)
      .where(
        and(
          eq(userPlatformRatings.userId, loggedInUser.id),
          eq(userPlatformRatings.platformId, upwork.id),
        ),
      );

    const [fiverrRating] = await db
      .select()
      .from(userPlatformRatings)
      .where(
        and(
          eq(userPlatformRatings.userId, loggedInUser.id),
          eq(userPlatformRatings.platformId, fiverr.id),
        ),
      );

    const [freelancerRating] = await db
      .select()
      .from(userPlatformRatings)
      .where(
        and(
          eq(userPlatformRatings.userId, loggedInUser.id),
          eq(userPlatformRatings.platformId, freelancer.id),
        ),
      );

    expect(upworkRating?.successRate).toBe(66.67);
    expect(fiverrRating?.successRate).toBe(50);
    expect(freelancerRating?.successRate).toBe(0);
  }, 10000);

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(`${baseUrl}/platforms/success-rate`).expect(401);
  });
});
