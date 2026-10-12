import { callerKey, limits, tooMany } from "@/lib/limits";
import { body, context, guarded, json } from "@/lib/matters/http";
import { PagesRequestSchema, transcribePages, type PagesError } from "@/lib/matters/pages";
import { addDocument, openMatter } from "@/lib/matters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STATUS: Record<PagesError, number> = {
  not_configured: 503,
  no_vision: 422,
  busy: 503,
  bad_own_model: 400,
  unreadable: 422,
};

/**
 * POST /api/matters/:id/pages — photographed pages become a document.
 *
 * The browser has shrunk each photo and covered the reader's own details. A
 * model reads the pages into text; the text is sealed under the matter's key
 * and the pictures are dropped, never stored. The agent then works from the
 * document like any other.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await context();
  if (ctx instanceof Response) return ctx;
  const allowed = limits.pages.check(callerKey(request, `pages:${ctx.sub}`));
  if (!allowed.allowed) return tooMany(allowed);
  const parsed = PagesRequestSchema.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const m = await openMatter(ctx.db, ctx.master, (await params).id, ctx.sub);
  if (!m) return json({ error: "not_found" }, 404);
  if (m.role === "observer") return json({ error: "not_allowed" }, 403);

  const outcome = await transcribePages(parsed.data, { env: process.env, signal: request.signal });
  if (!outcome.ok) return json({ error: outcome.error }, STATUS[outcome.error]);
  console.info(`[pages] served by ${outcome.servedBy}${outcome.own ? " (own key)" : ""}`);

  return guarded(async () => {
    const id = await addDocument(ctx.db, m, {
      name: parsed.data.name || "Photographed pages",
      mime: "image/jpeg",
      origin: "upload",
      text: outcome.text,
      bySub: ctx.sub,
    });
    return json({ id }, 201);
  });
}
