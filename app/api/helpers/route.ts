import { directory } from "@/lib/helpers/store";
import { publicDb } from "@/lib/helpers/http";
import { json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/helpers — everyone the directory shows, with their public attestations. */
export async function GET() {
  const db = publicDb();
  if (db instanceof Response) return db;
  return json({ helpers: await directory(db) });
}
