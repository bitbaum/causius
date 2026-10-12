import { auth } from "@/lib/auth";
import { offeredModels } from "@/lib/analyze";
import { json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/models — the free models the picker may offer. Ids and abilities only; no keys. */
export async function GET() {
  const session = await auth();
  if (!session?.actorId) return json({ error: "sign_in" }, 401);
  return json({ models: offeredModels(process.env) });
}
