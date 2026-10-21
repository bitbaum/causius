import { leaveMatter } from "@/lib/helpers/engagements";
import { context, guarded, json } from "@/lib/matters/http";
import { openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/matters/:id/leave — a helper steps away; their access ends at once. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => ((await leaveMatter(ctx.db, m, ctx.sub)) ? json({ ok: true }) : json({ error: "not_found" }, 404)));
}
