import { z } from "zod";
import { reviewCredential } from "@/lib/helpers/store";
import { reviewContext } from "@/lib/helpers/http";
import { body, guarded, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Decision = z.object({
  action: z.enum(["verify", "reject", "revoke"]),
  note: z.string().trim().max(1000).optional(),
});

/** POST /api/review/:id — verify (issue the attestation), reject (with a reason) or revoke. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await reviewContext();
  if (ctx instanceof Response) return ctx;
  const parsed = Decision.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const id = (await params).id;
  return guarded(async () =>
    (await reviewCredential(ctx.db, ctx.master, ctx.sub, id, parsed.data)) ? json({ ok: true }) : json({ error: "not_found" }, 404),
  );
}
