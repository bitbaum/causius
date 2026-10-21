import { callerKey, limits, tooMany } from "@/lib/limits";
import { matterEngagements, RequestInput, requestHelp } from "@/lib/helpers/engagements";
import { body, context, guarded, json } from "@/lib/matters/http";
import { openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/matters/:id/engagements — who was asked, and who works on it. */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return json({ engagements: await matterEngagements(ctx.db, ctx.master, m) });
}

/** POST /api/matters/:id/engagements — the owner asks a helper. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.engage.check(callerKey(request, `engage:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = RequestInput.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  return guarded(async () => json({ id: await requestHelp(ctx.db, m, ctx.sub, parsed.data) }, 201));
}
