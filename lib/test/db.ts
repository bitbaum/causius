import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Db } from "../db";
import * as schema from "../db/schema";

/**
 * A real Postgres in the test process (PGlite), with the same migration SQL
 * the deploy applies on the box. Tests run against the schema that ships,
 * not a mock of it.
 */
export async function testDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const pg = new PGlite();
  const dir = join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const statement of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (statement.trim()) await pg.exec(statement);
    }
  }
  const db = drizzle(pg, { schema }) as unknown as Db;
  return { db, close: () => pg.close() };
}

export const MASTER = Buffer.alloc(32, 7);
