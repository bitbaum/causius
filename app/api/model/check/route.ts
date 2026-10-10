import { byokVendor } from "@bitbaum/ai-kit/byok";
import { probeByokKey } from "@bitbaum/ai-kit/byok-probe";
import { z } from "zod";
import { callerKey, limits, tooMany } from "@/lib/limits";

/**
 * POST /api/model/check — does this key work, and which models can it use?
 *
 * ai-kit's `probeByokKey` asks the vendor itself and spends no tokens. It
 * never throws, never echoes the key, and reports a vendor it could not reach
 * as "could not check", not as a wrong key. Never hand-roll this (fleet
 * SHARED.md, "Your own model").
 *
 * The key passes through and is not stored or logged: Causius keeps a reader's
 * key in the reader's browser only.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A picker, not a catalogue dump. */
const MAX_MODELS = 200;

const Body = z.object({
  vendor: z.string().max(40),
  key: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .regex(/^[^\r\n]+$/),
});

const bad = () =>
  Response.json(
    { ok: false, reachable: true, message: "bad request", models: [], suggested: null },
    { status: 400 },
  );

export async function POST(request: Request) {
  const allowed = limits.modelCheck.check(callerKey(request, "model-check"));
  if (!allowed.allowed) return tooMany(allowed);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return bad();
  }
  const body = Body.safeParse(json);
  const vendor = body.success ? byokVendor(body.data.vendor) : undefined;
  if (!body.success || !vendor) return bad();

  const probe = await probeByokKey(vendor.id, body.data.key);
  return Response.json({
    ok: probe.ok,
    // "Could not check" and "wrong key" are different answers to a reader.
    reachable: probe.status !== null,
    message: probe.message.slice(0, 300),
    models: probe.models.slice(0, MAX_MODELS),
    suggested: probe.suggested,
  });
}
