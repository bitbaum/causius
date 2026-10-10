import { AnalyzeRequestSchema, analyzeLetter, type AnalyzeError } from "@/lib/analyze";
import { callerKey, limits, tooMany } from "@/lib/limits";

/**
 * POST /api/analyze — a letter (text and/or a photo of it) becomes a case file.
 *
 * Thin on purpose: validation is the zod schema, the model call is ai-kit's,
 * the rate limit is limitkit's. See lib/analyze.ts for why.
 *
 * Nothing is stored here. The letter goes to the model and the result goes
 * back to the browser, which is the only place a case is kept. Nothing about
 * the letter is logged either — only which link served it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<AnalyzeError, number> = {
  not_configured: 503,
  no_vision: 422,
  busy: 503,
  unreadable_analysis: 502,
  bad_own_model: 400,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const empty = parsed.error.issues.some((i) => i.message === "empty");
    return Response.json({ error: empty ? "empty" : "bad_request" }, { status: 400 });
  }

  const own = parsed.data.byok !== undefined && parsed.data.byok !== null;
  const limiter = own ? limits.analyzeOwn : limits.analyzeFree;
  const allowed = limiter.check(callerKey(request, own ? "analyze-own" : "analyze"));
  if (!allowed.allowed) return tooMany(allowed);

  const outcome = await analyzeLetter(parsed.data, { env: process.env, signal: request.signal });
  if (!outcome.ok) {
    return Response.json({ error: outcome.error }, { status: STATUS[outcome.error] });
  }
  console.info(`[analyze] served by ${outcome.servedBy}${outcome.ownModel ? " (own key)" : ""}`);
  return Response.json({ case: outcome.case, ownModel: outcome.ownModel });
}
