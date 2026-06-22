import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { featureFlags } from "../db/schema/index.js";

// In-memory cache for the current Worker isolate.
// This is cleared when the isolate spins down, but speeds up requests
// hitting the same isolate.
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const flagCache = new Map();

/**
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(key) {
  const now = Date.now();
  const cached = flagCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const [flag] = await db
    .select({ isEnabled: featureFlags.isEnabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);

  const isEnabled = flag?.isEnabled ?? false;

  flagCache.set(key, {
    value: isEnabled,
    expiresAt: now + CACHE_TTL_MS,
  });

  return isEnabled;
}
