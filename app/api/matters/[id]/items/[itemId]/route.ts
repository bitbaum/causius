import { z } from "zod";
import { body, context, guarded, json } from "@/lib/matters/http";
import { openMatter, setItemStatus } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Patch = z.object({ status: z.enum(["open", "done"]) });

/** PATCH /api/matters/:id/items/:itemId — tick a deadline or task off, or back on. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = Patch.safeParse(await body(request));
  const { id, itemId } = await params;
  if (!parsed.success || !z.uuid().safeParse(itemId).success) return json({ error: "bad_request" }, 400);
  const m = await openMatter(ctx.db, ctx.master, id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => {
    await setItemStatus(ctx.db, m, itemId, parsed.data.status);
    return json({ ok: true });
  });
}
