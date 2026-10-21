import { z } from "zod";
import { locales } from "@/i18n/routing";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { runTurn, type TurnError } from "@/lib/matters/agent";
import { body, context, json } from "@/lib/matters/http";
import { loadMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A turn may search, read and draft; give it room.
export const maxDuration = 300;

const Message = z.object({
  text: z.string().trim().min(1).max(20_000),
  /** The reader's own model, from their browser. Validated against ai-kit's closed list. */
  byok: z.unknown().optional(),
  /** A free model the reader picked; honoured only if this deployment offers it. */
  model: z.string().max(120).optional(),
  /** The language of the reader's interface: the agent answers in it. */
  locale: z.enum(locales).optional(),
});

const STATUS: Record<TurnError, number> = {
  not_found: 404,
  not_allowed: 403,
  not_configured: 503,
  busy: 503,
  bad_own_model: 400,
};

/** POST /api/matters/:id/messages — write to the matter; the agent works the turn. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const parsed = Message.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const own = parsed.data.byok !== undefined && parsed.data.byok !== null;
  const allowed = (own ? limits.turnOwn : limits.turnFree).check(callerKey(request, `turn:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);

  const id = (await params).id;
  const outcome = await runTurn({
    db: ctx.db,
    master: ctx.master,
    matterId: id,
    sub: ctx.sub,
    text: parsed.data.text,
    byok: parsed.data.byok,
    model: parsed.data.model,
    locale: parsed.data.locale,
    env: process.env,
    signal: request.signal,
  });
  if (!outcome.ok) return json({ error: outcome.error }, STATUS[outcome.error]);
  console.info(`[turn] served by ${outcome.servedBy}${own ? " (own key)" : ""}`);
  return json({ matter: await loadMatter(ctx.db, ctx.master, id, ctx.sub) });
}
