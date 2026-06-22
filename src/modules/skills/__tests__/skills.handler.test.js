import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthApp } from "../../../../test/factories/auth.js";
import { createApp } from "../../../app.js";
import { db } from "../../../db/index.js";
import { skills } from "../../../db/schema/skills.js";
import { userSkills } from "../../../db/schema/user-skills.js";
import { createSkill } from "../../../../test/factories/skills.js";

const baseUrl = "/api/v1/skills";

describe(`GET ${baseUrl}`, () => {
  it("returns current user skills", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const skill = await createSkill("Node.js");

    await db.insert(userSkills).values({
      userId: loggedInUser.id,
      skillId: skill.id,
    });

    const res = await authApp.get(baseUrl).expect(200);

    expect(res.body.data).toEqual(
      expect.arrayContaining([{ skillId: skill.id, skillName: "Node.js" }]),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();
    await request(app).get(baseUrl).expect(401);
  });
});

describe(`POST ${baseUrl}`, () => {
  it("adds an existing skill by skillId", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const skill = await createSkill("TypeScript");

    const res = await authApp
      .post(baseUrl)
      .send({ skillId: skill.id })
      .expect(201);

    expect(res.body.data).toMatchObject({
      userId: loggedInUser.id,
      skillId: skill.id,
      skillName: "TypeScript",
    });
  });

  it("creates and adds skill by name when id is missing", async () => {
    const { authApp } = await createAuthApp();

    const res = await authApp
      .post(baseUrl)
      .send({ name: "Prompt Engineering" })
      .expect(201);

    expect(res.body.data.skillName).toBe("Prompt Engineering");

    const [createdSkill] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, res.body.data.skillId));

    expect(createdSkill?.name).toBe("Prompt Engineering");
  });

  it("enforces max 50 skills per user", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    const seedSkills = Array.from({ length: 50 }, (_, index) => ({
      name: `Skill ${index + 1}`,
    }));

    const insertedSkills = await db
      .insert(skills)
      .values(seedSkills)
      .returning();

    await db.insert(userSkills).values(
      insertedSkills.map((skill) => ({
        userId: loggedInUser.id,
        skillId: skill.id,
      })),
    );

    await authApp.post(baseUrl).send({ name: "Skill 51" }).expect(400);
  });
});

describe(`POST ${baseUrl}/import-cv`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("imports skills extracted from uploaded CV", async () => {
    const { authApp, loggedInUser } = await createAuthApp();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      /** @type {any} */ ({
        ok: true,
        status: 200,
        json: async () => ({
          candidate_profile: {
            skills: ["node.js", "docker", "node.js", "sql"],
          },
        }),
      }),
    );

    const res = await authApp
      .post(`${baseUrl}/import-cv`)
      .attach("file", Buffer.from("%PDF-1.4 fake"), {
        filename: "cv.pdf",
        contentType: "application/pdf",
      })
      .expect(201);

    expect(res.body.data.totalDetected).toBe(3);
    expect(res.body.data.addedCount).toBe(3);

    const persistedSkills = await db
      .select({
        skillId: userSkills.skillId,
      })
      .from(userSkills)
      .where(eq(userSkills.userId, loggedInUser.id));

    expect(persistedSkills).toHaveLength(3);
  });

  it("returns 502 when CV analysis service fails", async () => {
    const { authApp } = await createAuthApp();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      /** @type {any} */ ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await authApp
      .post(`${baseUrl}/import-cv`)
      .attach("file", Buffer.from("%PDF-1.4 fake"), {
        filename: "cv.pdf",
        contentType: "application/pdf",
      })
      .expect(502);
  });

  it("returns 401 when unauthenticated", async () => {
    const app = await createApp();

    await request(app)
      .post(`${baseUrl}/import-cv`)
      .attach("file", Buffer.from("%PDF-1.4 fake"), {
        filename: "cv.pdf",
        contentType: "application/pdf",
      })
      .expect(401);
  });
});

describe(`PATCH ${baseUrl}/{skillId}`, () => {
  it("replaces current user skill", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const current = await createSkill("PHP");
    const target = await createSkill("Go");

    await db
      .insert(userSkills)
      .values({ userId: loggedInUser.id, skillId: current.id });

    const res = await authApp
      .patch(`${baseUrl}/${current.id}`)
      .send({ skillId: target.id })
      .expect(200);

    expect(res.body.data).toMatchObject({
      userId: loggedInUser.id,
      skillId: target.id,
      skillName: "Go",
    });

    const [oldMapping] = await db
      .select()
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, loggedInUser.id),
          eq(userSkills.skillId, current.id),
        ),
      );

    const [newMapping] = await db
      .select()
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, loggedInUser.id),
          eq(userSkills.skillId, target.id),
        ),
      );

    expect(oldMapping).toBeUndefined();
    expect(newMapping).toBeDefined();
  });
});

describe(`DELETE ${baseUrl}/{skillId}`, () => {
  it("deletes skill mapping and keeps skill row", async () => {
    const { authApp, loggedInUser } = await createAuthApp();
    const skill = await createSkill("Rust");

    await db
      .insert(userSkills)
      .values({ userId: loggedInUser.id, skillId: skill.id });

    await authApp.delete(`${baseUrl}/${skill.id}`).expect(200);

    const [mapping] = await db
      .select()
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, loggedInUser.id),
          eq(userSkills.skillId, skill.id),
        ),
      );

    const [skillRow] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, skill.id));

    expect(mapping).toBeUndefined();
    expect(skillRow).toBeDefined();
    expect(skillRow?.name).toBe("Rust");
  });

  it("returns 401 when unauthenticated", async () => {
    const skill = await createSkill("Docker");
    const app = await createApp();

    await request(app).delete(`${baseUrl}/${skill.id}`).expect(401);
  });
});

describe(`GET ${baseUrl}/search`, () => {
  it("returns all skills when no query is provided", async () => {
    const { authApp } = await createAuthApp();
    await createSkill("JavaScript");
    await createSkill("Java");

    const res = await authApp.get(`${baseUrl}/search`).expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skillName: "JavaScript" }),
        expect.objectContaining({ skillName: "Java" }),
      ]),
    );
  });

  it("fuzzy matches skills by name", async () => {
    const { authApp } = await createAuthApp();
    await createSkill("React");
    await createSkill("React Native");
    await createSkill("Vue.js");

    // Search with a typo
    const res = await authApp
      .get(`${baseUrl}/search`)
      .query({ q: "reakt" })
      .expect(200);

    expect(res.body.data[0].skillName).toContain("React");
    // TODO: Fix any later
    expect(
      res.body.data.some((/** @type any */ s) => s.skillName === "Vue.js"),
    ).toBe(false);
  });

  it("respects the limit parameter", async () => {
    const { authApp } = await createAuthApp();
    for (let i = 1; i <= 20; i++) {
      await createSkill(`Skill ${i}`);
    }

    const res = await authApp
      .get(`${baseUrl}/search`)
      .query({ limit: 5 })
      .expect(200);

    expect(res.body.data.length).toBe(5);
  });
});
