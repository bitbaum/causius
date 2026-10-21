import { callerKey, limits, tooMany } from "@/lib/limits";
import { CredentialInput, ownHelper, submitCredential } from "@/lib/helpers/store";
import { body, context, guarded, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/helper/credentials — ask Causius to check an admission. The evidence is sealed. */
export async function POST(request: Request) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.helperWrite.check(callerKey(request, `helper:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = CredentialInput.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  return guarded(async () => {
    await submitCredential(ctx.db, ctx.master, ctx.sub, parsed.data);
    return json({ helper: await ownHelper(ctx.db, ctx.sub) }, 201);
  });
}
