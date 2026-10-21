import { endEngagement } from "@/lib/helpers/engagements";
import { context, guarded, json } from "@/lib/matters/http";
import { openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/matters/:id/engagements/:engagementId — the owner withdraws a request or ends the work. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; engagementId: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const { id, engagementId } = await params;
  const m = await openMatter(ctx.db, ctx.master, id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () =>
    (await endEngagement(ctx.db, m, engagementId)) ? json({ ok: true }) : json({ error: "not_found" }, 404),
  );
}
