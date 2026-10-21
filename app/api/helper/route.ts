import { callerKey, limits, tooMany } from "@/lib/limits";
import { deleteHelper, HelperInput, ownHelper, saveHelper } from "@/lib/helpers/store";
import { body, context, guarded, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/helper — the signed-in person's own helper profile, or null. */
export async function GET() {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  return json({ helper: await ownHelper(ctx.db, ctx.sub) });
}

/** PUT /api/helper — create or change it. */
export async function PUT(request: Request) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.helperWrite.check(callerKey(request, `helper:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = HelperInput.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  return guarded(async () => {
    await saveHelper(ctx.db, ctx.sub, parsed.data);
    return json({ helper: await ownHelper(ctx.db, ctx.sub) });
  });
}

/** DELETE /api/helper — remove the profile, its credentials and engagements. */
export async function DELETE() {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  await deleteHelper(ctx.db, ctx.sub);
  return json({ ok: true });
}
