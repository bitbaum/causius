import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encryption at rest for everything a matter contains.
 *
 * ENVELOPE ENCRYPTION. Each matter has its own random 256-bit data key. Every
 * sensitive field of the matter — its title, facts, messages, documents — is
 * sealed with that key (AES-256-GCM). The data key itself is stored sealed
 * with the deployment's master key, which lives only in the server's
 * environment, never in the database or a backup of it.
 *
 * What this protects against: a leaked database dump or backup is a pile of
 * ciphertext. What it does not: someone running code on the app server can
 * read a matter, because the agent working the matter has to. That is stated
 * in the README rather than implied away; the in-house runner (roadmap) is
 * the answer for a firm that cannot accept it.
 *
 * Every ciphertext is bound to WHERE it belongs with additional authenticated
 * data — the matter id and the field's purpose. A sealed title copied into
 * another matter, or into a message field of the same matter, fails to open
 * rather than being silently shown in the wrong place.
 *
 * Format: `v1.<iv>.<ciphertext>.<tag>`, each part base64url. The version
 * prefix leaves room to rotate the scheme without guessing.
 */
const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class SealError extends Error {}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}

function unb64(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function aad(context: string): Buffer {
  return Buffer.from(`causius:${context}`, "utf8");
}

export function sealBytes(key: Buffer, plaintext: Buffer, context: string): string {
  if (key.length !== KEY_BYTES) throw new SealError("key must be 32 bytes");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  cipher.setAAD(aad(context));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return ["v1", b64(iv), b64(ct), b64(cipher.getAuthTag())].join(".");
}

export function openBytes(key: Buffer, sealed: string, context: string): Buffer {
  if (key.length !== KEY_BYTES) throw new SealError("key must be 32 bytes");
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new SealError("not a sealed value");
  const [, iv, ct, tag] = parts.map(unb64) as [Buffer, Buffer, Buffer, Buffer];
  if (iv.length !== IV_BYTES || tag.length !== 16) throw new SealError("malformed sealed value");
  try {
    const decipher = createDecipheriv(ALG, key, iv);
    decipher.setAAD(aad(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  } catch {
    // Wrong key, wrong place, or tampered: all the same answer, on purpose.
    throw new SealError("could not open sealed value");
  }
}

export function sealJson(key: Buffer, value: unknown, context: string): string {
  return sealBytes(key, Buffer.from(JSON.stringify(value), "utf8"), context);
}

export function openJson<T = unknown>(key: Buffer, sealed: string, context: string): T {
  return JSON.parse(openBytes(key, sealed, context).toString("utf8")) as T;
}

/**
 * The master key, from `CAUSIUS_MASTER_KEY` (32 bytes, base64). Refuses to run
 * with a missing or short key rather than falling back to anything: an app
 * that quietly encrypts with a default key is worse than one that will not
 * start.
 */
export function masterKey(env: Record<string, string | undefined> = process.env): Buffer {
  const raw = env.CAUSIUS_MASTER_KEY?.trim();
  if (!raw) throw new SealError("CAUSIUS_MASTER_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new SealError("CAUSIUS_MASTER_KEY must be 32 bytes, base64");
  return key;
}

export function encryptionConfigured(env: Record<string, string | undefined> = process.env): boolean {
  try {
    masterKey(env);
    return true;
  } catch {
    return false;
  }
}

/** A fresh data key for a new matter, and its sealed form for storage. */
export function newMatterKey(master: Buffer, matterId: string): { key: Buffer; sealed: string } {
  const key = randomBytes(KEY_BYTES);
  return { key, sealed: sealBytes(master, key, `dek:${matterId}`) };
}

export function openMatterKey(master: Buffer, sealed: string, matterId: string): Buffer {
  return openBytes(master, sealed, `dek:${matterId}`);
}

/**
 * A matter's sealer: every field sealed under the matter's key and bound to
 * the matter and the field's purpose.
 */
export function matterSealer(key: Buffer, matterId: string) {
  const ctx = (purpose: string) => `${matterId}:${purpose}`;
  return {
    seal: (purpose: string, value: unknown) => sealJson(key, value, ctx(purpose)),
    open: <T>(purpose: string, sealed: string) => openJson<T>(key, sealed, ctx(purpose)),
    sealBytes: (purpose: string, bytes: Buffer) => sealBytes(key, bytes, ctx(purpose)),
    openBytes: (purpose: string, sealed: string) => openBytes(key, sealed, ctx(purpose)),
  };
}

export type MatterSealer = ReturnType<typeof matterSealer>;
