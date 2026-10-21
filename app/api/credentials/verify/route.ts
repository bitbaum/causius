import { z } from "zod";
import { encryptionConfigured, masterKey } from "@/lib/crypto";
import { dbConfigured, getDb } from "@/lib/db";
import { verifyAttestation } from "@/lib/helpers/attest";
import { credentialStatus } from "@/lib/helpers/store";
import { callerKey, limits, tooMany } from "@/lib/limits";
import { body, json } from "@/lib/matters/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Check = z.object({
  token: z.string().trim().min(10).max(8000),
  disclosures: z.array(z.string().max(2000)).max(10).optional(),
});

/**
 * POST /api/credentials/verify — check an attestation, and any disclosures
 * presented with it. The signature says Causius issued it; the record says
 * whether it still stands (a revoked one has a valid signature too).
 */
export async function POST(request: Request) {
  const allowed = limits.verify.check(callerKey(request, "verify"));
  if (!allowed.allowed) return tooMany(allowed);
  if (!encryptionConfigured()) return json({ error: "not_configured" }, 503);
  const parsed = Check.safeParse(await body(request));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const result = verifyAttestation(masterKey(), parsed.data.token, parsed.data.disclosures ?? []);
  if (!result.ok) return json({ result });
  const status = dbConfigured() ? await credentialStatus(getDb(), result.credentialId) : null;
  return json({ result, status });
}
