import { faker } from "@faker-js/faker";
import { db } from "../../src/db/index.js";
import { account, session, user } from "../../src/db/schema/auth.js";
import { auth } from "../../src/lib/auth.js";

/**
 * @typedef {import("../../src/types.js").UserSelect} UserSelect
 * @typedef {import("../../src/types.js").UserInsert} UserInsert
 *
 * @typedef {import("../../src/types.js").AccountSelect} AccountSelect
 * @typedef {import("../../src/types.js").AccountInsert} AccountInsert
 *
 * @typedef {import("../../src/types.js").SessionSelect} SessionSelect
 * @typedef {import("../../src/types.js").SessionInsert} SessionInsert
 */

/**
 * Create a test user
 * @param {Partial<UserSelect>} userOverrides - user data
 * @returns {Promise<UserSelect>}
 */
export async function createUser(userOverrides = {}) {
  const userData = buildUserData(userOverrides);

  const [createdUser] = await db.insert(user).values(userData).returning();

  if (!createdUser) {
    throw new Error("Failed to create test user");
  }

  return createdUser;
}

/**
 * Creates a user with an associated credential account (email/password flow).
 * Stores a plain bcrypt-style placeholder — replace with your real hash logic.
 *
 * @param {Partial<UserSelect>} userOverrides - user data
 * @param {Partial<AccountSelect>} accountOverrides
 * @returns {Promise<{ user: UserSelect, account: AccountSelect }>}
 *
 * @example
 * const { user, account } = await createUserWithAccount({ name: "Bob" }, { password: "secret123" });
 */
export async function createUserWithAccount(userOverrides = {}, accountOverrides = {}) {
  const createdUser = await createUser(userOverrides);

  const accountData = await buildAccountData({ ...accountOverrides, userId: createdUser.id });

  const [createdAccount] = await db.insert(account).values(accountData).returning();

  if (!createdAccount) {
    throw new Error("Failed to create test user with account");
  }

  return { user: createdUser, account: createdAccount };
}

/**
 * Creates a user and an active session for them.
 *
 * @param {Partial<UserSelect>} userOverrides - user data
 * @param {Partial<AccountSelect>} accountOverrides
 * @param {Partial<SessionSelect>} sessionOverrides
 * @returns {Promise<{ user: UserSelect, session: SessionSelect }>}
 *
 * @example
 * const { user, session } = await createLoggedInUser();
 * // use session.token in Authorization header: `Bearer ${session.token}`
 */
export async function createLoggedInUser(
  userOverrides = {},
  accountOverrides = {},
  sessionOverrides = {},
) {
  const { user: createdUser } = await createUserWithAccount(userOverrides, accountOverrides);
  const sessionData = buildSessionData({ ...sessionOverrides, userId: createdUser.id });

  const [createdSession] = await db.insert(session).values(sessionData).returning();

  if (!createdSession) {
    throw new Error("Failed to create test user with session");
  }

  return { user: createdUser, session: createdSession };
}

/**
 * Build user data
 * @param {Partial<UserSelect>} overrides - user data
 * @returns {UserSelect}
 */
export function buildUserData(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: faker.datatype.boolean(),
    image: faker.internet.url(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    appNotifications: true,
    emailNotifications: true,
    cvLink: "",
    darkMode: true,
    inAppBrowser: true,
    language: "en",
    phone: "123456789",
    platformFilters: "[]",
    ...overrides,
  };
}

/**
 * Build account data
 * @param {Partial<AccountInsert>} overrides - account data
 * @returns {Promise<AccountInsert>}
 */
export async function buildAccountData(overrides = {}) {
  const password = overrides.password ?? "password";
  const passwordHash = await (await auth.$context).password.hash(password);

  const userId = overrides.userId ?? faker.string.uuid();

  return {
    id: faker.string.uuid(),
    userId: userId,
    accountId: userId,
    providerId: "credential",
    password: passwordHash,
    ...overrides,
  };
}

/**
 * Build session data
 * @param {Partial<SessionInsert>} overrides - session data
 * @returns {SessionInsert}
 */
export function buildSessionData(overrides = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    token: faker.string.uuid(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h from now
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
    ...overrides,
  };
}
