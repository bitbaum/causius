import { auth } from "@/lib/auth";
import { encryptionConfigured, masterKey } from "@/lib/crypto";
import { dbConfigured, getDb, type Db } from "@/lib/db";
import { NotAllowed } from "./store";

/**
 * The two checks every matter route makes, in one place: is anyone signed in,
 * and is this deployment able to keep a matter safely (database AND master
 * key). The third check — does this person take part in THIS matter — is made
 * by the store itself, on every call.
 */
export type Ctx = { db: Db; master: Buffer; sub: string; name: string | null };

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function context(): Promise<Ctx | Response> {
  if (!dbConfigured() || !encryptionConfigured()) return json({ error: "not_configured" }, 503);
  const session = await auth();
  const sub = session?.actorId;
  if (!sub) return json({ error: "sign_in" }, 401);
  return { db: getDb(), master: masterKey(), sub, name: session.user?.name ?? null };
}

/** Turn the store's refusals into answers rather than 500s. */
export async function guarded(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotAllowed) return json({ error: "not_allowed" }, 403);
    throw error;
  }
}

export async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
