import { publicHelper } from "@/lib/helpers/store";
import { publicDb } from "@/lib/helpers/http";
import { json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/helpers/:id — one public profile; 404 when it is not shown. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = publicDb();
  if (db instanceof Response) return db;
  const helper = await publicHelper(db, (await params).id);
  return helper ? json({ helper }) : json({ error: "not_found" }, 404);
}
