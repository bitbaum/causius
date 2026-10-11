import { freeAvailability } from "@/lib/analyze";

/**
 * GET /api/health — is the site up, and can it analyse a letter without the
 * reader's own key? Booleans only: which vendors are keyed is nobody's
 * business, and no key or key hint is ever returned.
 *
 * The intake page reads this to say what will happen before a letter is typed
 * in, and it is the one thing to curl after a deploy.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { ok: true, analysis: freeAvailability(process.env) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
