import { encryptionConfigured, masterKey } from "@/lib/crypto";
import { jwks } from "@/lib/helpers/attest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /.well-known/jwks.json — the public key Causius signs attestations with.
 * Anyone can check a lawyer's attestation against it with any EdDSA library,
 * without asking Causius.
 */
export async function GET() {
  if (!encryptionConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  return Response.json(jwks(masterKey()), { headers: { "Cache-Control": "public, max-age=3600" } });
}
