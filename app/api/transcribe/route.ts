import {
  ChainExhaustedError,
  createHealthTracker,
  looksLikeSilence,
  speechChain,
  speechConfigured,
  transcribe,
} from "@bitbaum/ai-kit";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { json } from "@/lib/matters/http";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A take is capped at two minutes in the browser; this is the server's own ceiling. */
const MAX_BYTES = 8 * 1024 * 1024;
const health = createHealthTracker();

/**
 * POST /api/transcribe — the server leg of the microphone.
 *
 * Speaking is the one place a letter's content leaves the browser WITHOUT
 * passing through lib/redact.ts: audio cannot be anonymised. It goes to the
 * speech vendor and nowhere else, it is not stored, and nothing about it is
 * logged but which vendor answered. The page says so before the first take
 * (see /security). The transcript comes back as text the person can edit
 * before it is sent, and sending it runs the usual redaction.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.actorId) return json({ error: "sign_in" }, 401);
  const allowed = limits.transcribe.check(callerKey(request, `transcribe:${session.actorId}`));
  if (!allowed.allowed) return tooMany(allowed);
  if (!speechConfigured(process.env)) return json({ error: "not_configured" }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return json({ error: "bad_request" }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "too_large" }, 413);

  try {
    const result = await transcribe({
      audio,
      filename: "dictation.webm",
      language: String(form.get("locale") ?? "") || undefined,
      chain: speechChain(),
      env: process.env,
      health,
      timeoutMs: 20_000,
      signal: request.signal,
    });
    console.info(`[transcribe] served by ${result.id}`);
    const said = result.text.trim();
    return json({ text: looksLikeSilence(said) ? "" : said });
  } catch (error) {
    if (error instanceof ChainExhaustedError) return json({ error: "busy" }, 503);
    throw error;
  }
}
