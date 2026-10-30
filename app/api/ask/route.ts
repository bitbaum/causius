import { AskRequestSchema, askCausius, type AskError } from "@/lib/ask";
import { callerKey, limits, tooMany } from "@/lib/limits";

/**
 * POST /api/ask — a question to Causius, over the fleet's one bot contract
 * (lib/ask.ts). Thin: validation is the zod schema, the call is ai-kit's,
 * the limit is limitkit's. Nothing about the question or the answer is
 * stored or logged — only which link served it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<AskError, number> = { not_configured: 503, busy: 503, bad_own_model: 400 };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const own = parsed.data.byok !== undefined && parsed.data.byok !== null;
  const allowed = (own ? limits.askOwn : limits.askFree).check(
    callerKey(request, own ? "ask-own" : "ask"),
  );
  if (!allowed.allowed) return tooMany(allowed);

  const outcome = await askCausius(parsed.data, { env: process.env, signal: request.signal });
  if (!outcome.ok)
    return Response.json({ error: outcome.error }, { status: STATUS[outcome.error] });
  console.info(`[ask] served by ${outcome.servedBy}${outcome.ownModel ? " (own key)" : ""}`);
  return Response.json({
    text: outcome.text,
    replies: outcome.replies,
    ownModel: outcome.ownModel,
  });
}
