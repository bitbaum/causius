import { helperRequests } from "@/lib/helpers/engagements";
import { context, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/helper/requests — what people asked the signed-in helper for. */
export async function GET() {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  return json({ requests: await helperRequests(ctx.db, ctx.master, ctx.sub) });
}
