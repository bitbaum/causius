import { reviewQueue } from "@/lib/helpers/store";
import { reviewContext } from "@/lib/helpers/http";
import { json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/review — credentials waiting for a decision, evidence opened. Staff only. */
export async function GET() {
  const ctx = await reviewContext();
  if (ctx instanceof Response) return ctx;
  return json({ queue: await reviewQueue(ctx.db, ctx.master) });
}
