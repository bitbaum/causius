import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The database handle, created on first use.
 *
 * `next build` imports every module, and the build has no DATABASE_URL, so
 * connecting at import time would fail the build of pages that never touch
 * the database. Same shape as Heidi's and Vitareba's.
 */
export type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // DATABASE_POOL_MAX: a single-connection test Postgres needs 1.
    const max = Number(process.env.DATABASE_POOL_MAX) || 10;
    instance = drizzle(new Pool({ connectionString: url, max }), { schema });
  }
  return instance;
}

/** For tests: use an already-built handle (an in-process Postgres). */
export function setDb(db: Db | undefined) {
  instance = db;
}

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
