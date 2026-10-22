import { z } from "zod";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { body, context, json } from "@/lib/matters/http";
import { createMatter, JURISDICTION, listMatters, wordsToHide } from "@/lib/matters/store";
import { WORKFLOW_IDS } from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/matters — the signed-in person's matters. */
export async function GET() {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  return json({ matters: await listMatters(ctx.db, ctx.master, ctx.sub) });
}

const Create = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  jurisdiction: z.string().trim().toUpperCase().regex(JURISDICTION).optional(),
  hide: z.array(z.string().trim().min(2).max(120)).max(100).optional(),
  workflow: z.enum(WORKFLOW_IDS).optional(),
});

/** POST /api/matters — open a new matter. The first message starts the work. */
export async function POST(request: Request) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.matterCreate.check(callerKey(request, `matter-create:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = Create.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  // The person's account name is a word to hide from the model, sealed with
  // the matter like every other one. The participant row only ever holds a
  // role-shaped pseudonym, so the database in the clear names nobody.
  const hide = wordsToHide(ctx.name, parsed.data.hide);
  const id = await createMatter(ctx.db, ctx.master, {
    ownerSub: ctx.sub,
    jurisdiction: parsed.data.jurisdiction ?? null,
    core: { title: parsed.data.title ?? "New matter", summary: "", area: "", facts: [], hide, workflow: parsed.data.workflow },
  });
  return json({ id }, 201);
}
