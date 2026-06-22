import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../lib/env.js";
import * as schema from "./schema/index.js";

const sqlite = new Database(env.DB_FILE_NAME);

export const db = drizzle({ client: sqlite, schema });
