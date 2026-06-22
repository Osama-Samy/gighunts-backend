import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach } from "vitest";
import { main as resetDatabase } from "../src/db/scripts/reset.js";
import { env } from "../src/lib/env.js";

beforeEach(async () => {
  await resetDatabase();
  await deleteUploads();
});

async function deleteUploads() {
  const entries = await fs.readdir(env.UPLOADS_DIR);
  await Promise.all(
    entries.map((entry) =>
      fs.rm(path.join(env.UPLOADS_DIR, entry), { recursive: true, force: true }),
    ),
  );
}
