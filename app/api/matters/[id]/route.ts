import { z } from "zod";
import { body, context, guarded, json } from "@/lib/matters/http";
import { deleteMatter, loadMatter, openMatter, updateCore } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/matters/:id — the whole matter, for someone who takes part in it. */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const view = await loadMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  return view ? json({ matter: view }) : json({ error: "not_found" }, 404);
}

const Patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  hide: z.array(z.string().trim().min(2).max(120)).max(100).optional(),
});

/** PATCH /api/matters/:id — rename, or change the words kept from models. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = Patch.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => {
    await updateCore(ctx.db, m, (c) => ({
      ...c,
      title: parsed.data.title ?? c.title,
      hide: parsed.data.hide ?? c.hide,
    }));
    return json({ ok: true });
  });
}

/** DELETE /api/matters/:id — gone, with everything in it. Owner only. */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => {
    await deleteMatter(ctx.db, m);
    return json({ ok: true });
  });
}
