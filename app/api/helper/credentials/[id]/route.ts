import { ownHelper, withdrawCredential } from "@/lib/helpers/store";
import { context, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/helper/credentials/:id — withdraw one's own: pending is deleted, verified revoked. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const done = await withdrawCredential(ctx.db, ctx.sub, (await params).id);
  return done ? json({ helper: await ownHelper(ctx.db, ctx.sub) }) : json({ error: "not_found" }, 404);
}
