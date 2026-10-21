import {
  createHash,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  randomBytes,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { z } from "zod";
import { CANONICAL_URL } from "../site";

/**
 * Attestations: Causius vouching, in a way anyone can check, that a helper's
 * claim was verified — WITHOUT saying who the helper is.
 *
 * THE FORMAT is SD-JWT (IETF, "Selective Disclosure for JWTs"), signed with
 * Ed25519. The public token says: this profile, admitted in CH-ZH, checked by
 * Causius on this date, valid until then. The legal name and the register
 * number are inside it only as salted SHA-256 digests. The helper holds the
 * matching "disclosures" (salt, claim, value); handing them to a client lets
 * that client check that the name they were told is exactly the name Causius
 * verified, and the salt makes the digest impossible to guess from a list of
 * lawyers' names.
 *
 * WHAT IT IS NOT. This is selective disclosure with Causius as the issuer, not
 * a zero-knowledge proof. A verifier trusts that Causius checked the register.
 * A proof that needs no such trust needs the bar itself to issue credentials
 * to lawyers (BBS+ or an SD-JWT of its own); when one does, its credential
 * slots in where this one is issued, and the profile page is unchanged.
 *
 * THE KEY is derived from the master key (HKDF), so there is no second secret
 * to provision or to lose. Its public half is served at /.well-known/jwks.json.
 * Rotating it is a new `KEY_VERSION`: the info string changes, the kid
 * changes, old tokens fail to verify and are reissued by a reviewer.
 */
const KEY_VERSION = "v1";
const ISSUER = CANONICAL_URL;
export const VCT = `${ISSUER}/credentials/bar-admission`;
const TYP = "dc+sd-jwt";
const VALID_DAYS = 365;

/** PKCS#8 wrapping of a raw 32-byte Ed25519 seed (RFC 8410). */
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const unb64u = (s: string) => Buffer.from(s, "base64url");
const sha256 = (s: string) => createHash("sha256").update(s, "ascii").digest();

export interface IssuerKey {
  privateKey: KeyObject;
  publicKey: KeyObject;
  kid: string;
  jwk: { kty: "OKP"; crv: "Ed25519"; x: string; kid: string; alg: "EdDSA"; use: "sig" };
}

export function issuerKey(master: Buffer): IssuerKey {
  const seed = Buffer.from(hkdfSync("sha256", master, "causius", `attestation-key:${KEY_VERSION}`, 32));
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  const { x } = publicKey.export({ format: "jwk" }) as { x: string };
  // RFC 7638 thumbprint: members in lexicographic order, no whitespace.
  const kid = b64u(createHash("sha256").update(`{"crv":"Ed25519","kty":"OKP","x":"${x}"}`).digest());
  return { privateKey, publicKey, kid, jwk: { kty: "OKP", crv: "Ed25519", x, kid, alg: "EdDSA", use: "sig" } };
}

export function jwks(master: Buffer) {
  return { keys: [issuerKey(master).jwk] };
}

/** One disclosure: `[salt, claim, value]`, base64url of its JSON. */
function disclosure(claim: string, value: string): string {
  return b64u(JSON.stringify([b64u(randomBytes(16)), claim, value]));
}

export interface Attestation {
  /** The public token: header.payload.signature~ (no disclosures). */
  token: string;
  /** What the helper alone holds and may hand to a client. */
  disclosures: string[];
  expiresAt: Date;
}

export function issueAttestation(
  master: Buffer,
  claim: {
    credentialId: string;
    helperId: string;
    jurisdiction: string;
    legalName: string;
    registerNumber: string;
  },
  now = new Date(),
): Attestation {
  const key = issuerKey(master);
  const disclosures = [disclosure("legal_name", claim.legalName), disclosure("register_number", claim.registerNumber)];
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + VALID_DAYS * 86_400;
  const header = { alg: "EdDSA", typ: TYP, kid: key.kid };
  const payload = {
    iss: ISSUER,
    sub: `${ISSUER}/helpers/${claim.helperId}`,
    jti: claim.credentialId,
    iat,
    exp,
    vct: VCT,
    profession: "lawyer",
    jurisdiction: claim.jurisdiction,
    _sd_alg: "sha-256",
    // Sorted so the order says nothing about which digest is which claim.
    _sd: disclosures.map((d) => b64u(sha256(d))).sort(),
  };
  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const signature = b64u(sign(null, Buffer.from(signingInput, "ascii"), key.privateKey));
  return { token: `${signingInput}.${signature}~`, disclosures, expiresAt: new Date(exp * 1000) };
}

const Payload = z.object({
  iss: z.string(),
  sub: z.string(),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
  vct: z.string(),
  profession: z.string(),
  jurisdiction: z.string(),
  _sd_alg: z.literal("sha-256"),
  _sd: z.array(z.string()),
});

export type VerifyResult =
  | {
      ok: true;
      credentialId: string;
      subject: string;
      jurisdiction: string;
      issuedAt: Date;
      expiresAt: Date;
      /** Only the claims whose disclosures were presented and matched. */
      disclosed: Record<string, string>;
    }
  | { ok: false; reason: "malformed" | "unknown_key" | "bad_signature" | "expired" | "wrong_issuer" | "bad_disclosure" };

/**
 * Check a token, and any disclosures presented with it (either appended to
 * the token after `~`, or passed separately). A disclosure that does not hash
 * to one of the token's digests fails the whole check: a client told a name
 * that Causius did not verify must hear so, not get a partial yes.
 */
export function verifyAttestation(
  master: Buffer,
  presented: string,
  extraDisclosures: string[] = [],
  now = new Date(),
): VerifyResult {
  const [jwt, ...tail] = presented.trim().split("~");
  const disclosures = [...tail.filter(Boolean), ...extraDisclosures];
  const parts = jwt?.split(".");
  if (!parts || parts.length !== 3) return { ok: false, reason: "malformed" };
  const [h, p, s] = parts as [string, string, string];
  let header: { alg?: string; kid?: string; typ?: string };
  let payload: z.infer<typeof Payload>;
  try {
    header = JSON.parse(unb64u(h).toString("utf8"));
    const parsed = Payload.safeParse(JSON.parse(unb64u(p).toString("utf8")));
    if (!parsed.success) return { ok: false, reason: "malformed" };
    payload = parsed.data;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const key = issuerKey(master);
  if (header.alg !== "EdDSA" || header.typ !== TYP) return { ok: false, reason: "malformed" };
  if (header.kid !== key.kid) return { ok: false, reason: "unknown_key" };
  if (!verify(null, Buffer.from(`${h}.${p}`, "ascii"), key.publicKey, unb64u(s)))
    return { ok: false, reason: "bad_signature" };
  if (payload.iss !== ISSUER || payload.vct !== VCT) return { ok: false, reason: "wrong_issuer" };
  if (payload.exp * 1000 <= now.getTime()) return { ok: false, reason: "expired" };

  const disclosed: Record<string, string> = {};
  for (const d of disclosures) {
    if (!payload._sd.includes(b64u(sha256(d)))) return { ok: false, reason: "bad_disclosure" };
    try {
      const [, claim, value] = JSON.parse(unb64u(d).toString("utf8")) as [string, string, string];
      if (typeof claim !== "string" || typeof value !== "string") return { ok: false, reason: "bad_disclosure" };
      disclosed[claim] = value;
    } catch {
      return { ok: false, reason: "bad_disclosure" };
    }
  }
  return {
    ok: true,
    credentialId: payload.jti,
    subject: payload.sub,
    jurisdiction: payload.jurisdiction,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
    disclosed,
  };
}
