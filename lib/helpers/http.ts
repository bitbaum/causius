import { reviewer } from "@/lib/auth";
import { encryptionConfigured, masterKey } from "@/lib/crypto";
import { dbConfigured, getDb, type Db } from "@/lib/db";
import { json } from "@/lib/matters/http";

/**
 * The directory and a profile are public: they need the database and nothing
 * else. Signed-in helper routes use the matters' `context()`; review routes
 * use `reviewContext()`, which answers 403 to anyone who is not staff.
 */
export function publicDb(): Db | Response {
  return dbConfigured() ? getDb() : json({ error: "not_configured" }, 503);
}

export async function reviewContext(): Promise<{ db: Db; master: Buffer; sub: string } | Response> {
  if (!dbConfigured() || !encryptionConfigured()) return json({ error: "not_configured" }, 503);
  const who = await reviewer();
  if (!who) return json({ error: "not_allowed" }, 403);
  return { db: getDb(), master: masterKey(), sub: who.actorId };
}
