import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../../lib/env.js";
import { reset } from "drizzle-seed";
import * as schema from "../schema/index.js";

export async function main() {
  const db = drizzle(env.DB_FILE_NAME);
  await reset(db, schema);
}

main();
