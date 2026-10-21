import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { matterSealer, newMatterKey, openMatterKey } from "../crypto";
import type { Db } from "../db";
import { credentials, helpers } from "../db/schema";
import { JURISDICTION } from "../matters/store";
import { HELPER_AREAS, HELPER_KINDS, HELPER_LANGUAGES, PROFESSIONS, type HelperKind } from "../professions";
import { issueAttestation } from "./attest";

/**
 * Helpers and what Causius checked about them. Same shape as the matter store:
 * every entry point takes the caller's `sub` and decides from it, so a route
 * cannot forget who is asking.
 *
 * A profile is public by design and stored plain. The evidence behind a
 * credential (a lawyer's legal name and register number) is sealed under the
 * credential's own key, opened only for a reviewer deciding it and, once
 * verified, for the lawyer handing it to a client they chose.
 */

export class Refused extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const https = z.url({ protocol: /^https$/ }).max(500);

export const HelperInput = z.object({
  kind: z.enum(HELPER_KINDS),
  name: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(160).default(""),
  bio: z.string().trim().max(2000).default(""),
  jurisdictions: z.array(z.string().trim().toUpperCase().regex(JURISDICTION)).max(20).default([]),
  areas: z.array(z.enum(HELPER_AREAS)).max(HELPER_AREAS.length).default([]),
  languages: z.array(z.enum(HELPER_LANGUAGES)).max(HELPER_LANGUAGES.length).default([]),
  serviceUrl: https.nullable().default(null),
  status: z.enum(["draft", "listed", "paused"]).default("draft"),
});
export type HelperInput = z.input<typeof HelperInput>;

export const CredentialInput = z.object({
  jurisdiction: z.string().trim().toUpperCase().regex(JURISDICTION),
  legalName: z.string().trim().min(2).max(120),
  registerNumber: z.string().trim().min(1).max(80),
  /** Where a reviewer can read the admission in the public register. */
  registerUrl: https,
  note: z.string().trim().max(1000).default(""),
});
export type CredentialInput = z.input<typeof CredentialInput>;

export interface Evidence {
  legalName: string;
  registerNumber: string;
  registerUrl: string;
  note: string;
}

export interface PublicAttestation {
  credentialId: string;
  jurisdiction: string;
  token: string;
  verifiedAt: string;
  expiresAt: string;
}

export interface PublicHelper {
  id: string;
  kind: HelperKind;
  name: string;
  headline: string;
  bio: string;
  /** For a lawyer, ONLY the verified jurisdictions: that is where they may advise. */
  jurisdictions: string[];
  areas: string[];
  languages: string[];
  serviceUrl: string | null;
  attestations: PublicAttestation[];
}

export interface OwnCredential {
  id: string;
  jurisdiction: string;
  status: "pending" | "verified" | "rejected" | "revoked";
  reviewNote: string | null;
  submittedAt: string;
  expiresAt: string | null;
}

export interface OwnHelper extends PublicHelper {
  status: "draft" | "listed" | "paused";
  /** What the person typed, verified or not. */
  declaredJurisdictions: string[];
  /** Whether the directory shows them now, and if not, why. */
  visible: boolean;
  waitingFor: "listing" | "verification" | "language" | null;
  credentials: OwnCredential[];
}

type HelperRow = typeof helpers.$inferSelect;
type CredentialRow = typeof credentials.$inferSelect;

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

function validAttestations(rows: CredentialRow[], now: Date): PublicAttestation[] {
  return rows
    .filter((c) => c.status === "verified" && c.token && c.expiresAt && c.expiresAt > now)
    .map((c) => ({
      credentialId: c.id,
      jurisdiction: c.jurisdiction,
      token: c.token!,
      verifiedAt: iso(c.reviewedAt!),
      expiresAt: iso(c.expiresAt!),
    }));
}

function toPublic(h: HelperRow, creds: CredentialRow[], now: Date): PublicHelper {
  const attestations = validAttestations(creds, now);
  return {
    id: h.id,
    kind: h.kind,
    name: h.name,
    headline: h.headline,
    bio: h.bio,
    jurisdictions: PROFESSIONS[h.kind].requires
      ? [...new Set(attestations.map((a) => a.jurisdiction))]
      : h.jurisdictions,
    areas: h.areas,
    languages: h.languages,
    serviceUrl: h.serviceUrl,
    attestations,
  };
}

/** Why a profile the person wants listed is not in the directory yet. */
function waitingFor(h: HelperRow, pub: PublicHelper): OwnHelper["waitingFor"] {
  if (h.status !== "listed") return "listing";
  if (h.languages.length === 0) return "language";
  if (PROFESSIONS[h.kind].requires && pub.attestations.length === 0) return "verification";
  return null;
}

async function credentialsOf(db: Db, helperIds: string[]): Promise<CredentialRow[]> {
  if (helperIds.length === 0) return [];
  return db
    .select()
    .from(credentials)
    .where(inArray(credentials.helperId, helperIds))
    .orderBy(asc(credentials.submittedAt));
}

export async function helperBySub(db: Db, sub: string): Promise<HelperRow | null> {
  const [row] = await db.select().from(helpers).where(eq(helpers.sub, sub));
  return row ?? null;
}

export async function ownHelper(db: Db, sub: string, now = new Date()): Promise<OwnHelper | null> {
  const h = await helperBySub(db, sub);
  if (!h) return null;
  const creds = await credentialsOf(db, [h.id]);
  const pub = toPublic(h, creds, now);
  const waiting = waitingFor(h, pub);
  return {
    ...pub,
    status: h.status,
    declaredJurisdictions: h.jurisdictions,
    visible: waiting === null,
    waitingFor: waiting,
    credentials: creds.map((c) => ({
      id: c.id,
      jurisdiction: c.jurisdiction,
      status: c.status,
      reviewNote: c.reviewNote,
      submittedAt: iso(c.submittedAt),
      expiresAt: c.expiresAt ? iso(c.expiresAt) : null,
    })),
  };
}

/** Create or change the caller's own profile. */
export async function saveHelper(db: Db, sub: string, input: HelperInput): Promise<string> {
  const data = HelperInput.parse(input);
  const existing = await helperBySub(db, sub);
  const values = {
    kind: data.kind,
    name: data.name,
    headline: data.headline,
    bio: data.bio,
    jurisdictions: [...new Set(data.jurisdictions)],
    areas: [...new Set(data.areas)],
    languages: [...new Set(data.languages)],
    serviceUrl: data.serviceUrl,
    status: data.status,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(helpers).set(values).where(eq(helpers.id, existing.id));
    return existing.id;
  }
  const id = randomUUID();
  // A unique index on `sub` makes a double submit the second writer's no-op.
  await db.insert(helpers).values({ id, sub, ...values }).onConflictDoNothing();
  return (await helperBySub(db, sub))!.id;
}

/** Remove the caller's profile, with its credentials and engagements. Their matters stay. */
export async function deleteHelper(db: Db, sub: string): Promise<void> {
  await db.delete(helpers).where(eq(helpers.sub, sub));
}

/**
 * Everyone the directory shows. Listed, with at least one language, and — for
 * a kind that needs a credential — at least one that is verified and current.
 * Search and facets run over this list (searchkit, listkit), so it is the
 * whole list; at a few thousand profiles it moves to a query per facet.
 */
export async function directory(db: Db, now = new Date()): Promise<PublicHelper[]> {
  const rows = await db
    .select()
    .from(helpers)
    .where(eq(helpers.status, "listed"))
    .orderBy(desc(helpers.updatedAt))
    .limit(2000);
  const creds = await credentialsOf(
    db,
    rows.map((r) => r.id),
  );
  return rows
    .map((h) => toPublic(h, creds.filter((c) => c.helperId === h.id), now))
    .filter((p, i) => waitingFor(rows[i]!, p) === null);
}

/** One public profile, or null if it is not shown. */
export async function publicHelper(db: Db, id: string, now = new Date()): Promise<PublicHelper | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [h] = await db.select().from(helpers).where(eq(helpers.id, id));
  if (!h) return null;
  const pub = toPublic(h, await credentialsOf(db, [h.id]), now);
  return waitingFor(h, pub) === null ? pub : null;
}

// ── Credentials ─────────────────────────────────────────────────────────────

function credentialSealer(master: Buffer, row: { id: string; sealedKey: string }) {
  // The matter envelope is generic: a data key sealed by the master key and
  // bound to an id. A credential is its own record, with its own key.
  return matterSealer(openMatterKey(master, row.sealedKey, `credential:${row.id}`), `credential:${row.id}`);
}

/** A lawyer asks Causius to check their admission in one jurisdiction. */
export async function submitCredential(db: Db, master: Buffer, sub: string, input: CredentialInput): Promise<string> {
  const data = CredentialInput.parse(input);
  const h = await helperBySub(db, sub);
  if (!h) throw new Refused("no_profile");
  if (!PROFESSIONS[h.kind].requires) throw new Refused("not_needed");
  const open = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(
      and(
        eq(credentials.helperId, h.id),
        eq(credentials.jurisdiction, data.jurisdiction),
        inArray(credentials.status, ["pending", "verified"]),
      ),
    );
  if (open.length) throw new Refused("already_submitted");
  const id = randomUUID();
  const { key, sealed } = newMatterKey(master, `credential:${id}`);
  const sealer = matterSealer(key, `credential:${id}`);
  const evidence: Evidence = {
    legalName: data.legalName,
    registerNumber: data.registerNumber,
    registerUrl: data.registerUrl,
    note: data.note,
  };
  await db.insert(credentials).values({
    id,
    helperId: h.id,
    kind: PROFESSIONS[h.kind].requires!,
    jurisdiction: data.jurisdiction,
    sealedKey: sealed,
    sealedEvidence: sealer.seal("evidence", evidence),
  });
  return id;
}

/** The person withdraws a credential of their own: pending ones are deleted, verified ones revoked. */
export async function withdrawCredential(db: Db, sub: string, credentialId: string): Promise<boolean> {
  if (!z.uuid().safeParse(credentialId).success) return false;
  const h = await helperBySub(db, sub);
  if (!h) return false;
  const [c] = await db
    .select()
    .from(credentials)
    .where(and(eq(credentials.id, credentialId), eq(credentials.helperId, h.id)));
  if (!c) return false;
  if (c.status === "verified") {
    await db
      .update(credentials)
      .set({ status: "revoked", sealedDisclosures: null })
      .where(eq(credentials.id, c.id));
  } else {
    await db.delete(credentials).where(eq(credentials.id, c.id));
  }
  return true;
}

export interface ReviewItem {
  id: string;
  jurisdiction: string;
  status: CredentialRow["status"];
  submittedAt: string;
  helper: { id: string; name: string; kind: HelperKind };
  evidence: Evidence;
}

/** What waits for a reviewer, oldest first, with the evidence opened. */
export async function reviewQueue(db: Db, master: Buffer): Promise<ReviewItem[]> {
  const rows = await db
    .select({ c: credentials, h: helpers })
    .from(credentials)
    .innerJoin(helpers, eq(helpers.id, credentials.helperId))
    .where(eq(credentials.status, "pending"))
    .orderBy(asc(credentials.submittedAt))
    .limit(200);
  return rows.map(({ c, h }) => ({
    id: c.id,
    jurisdiction: c.jurisdiction,
    status: c.status,
    submittedAt: iso(c.submittedAt),
    helper: { id: h.id, name: h.name, kind: h.kind },
    evidence: credentialSealer(master, c).open<Evidence>("evidence", c.sealedEvidence),
  }));
}

/**
 * A reviewer's decision. Verifying issues the signed attestation and keeps its
 * disclosures sealed for the lawyer; rejecting tells them why; revoking
 * withdraws a verification (the public profile stops showing it at once).
 * Nobody reviews their own credential.
 */
export async function reviewCredential(
  db: Db,
  master: Buffer,
  reviewerSub: string,
  credentialId: string,
  decision: { action: "verify" | "reject" | "revoke"; note?: string },
  now = new Date(),
): Promise<boolean> {
  if (!z.uuid().safeParse(credentialId).success) return false;
  const [row] = await db
    .select({ c: credentials, h: helpers })
    .from(credentials)
    .innerJoin(helpers, eq(helpers.id, credentials.helperId))
    .where(eq(credentials.id, credentialId));
  if (!row) return false;
  const { c, h } = row;
  if (h.sub === reviewerSub) throw new Refused("own_credential");
  const from = decision.action === "revoke" ? "verified" : "pending";
  if (c.status !== from) throw new Refused("already_decided");
  const note = decision.note?.trim().slice(0, 1000) || null;
  const decided = { reviewedBySub: reviewerSub, reviewedAt: now, reviewNote: note };

  if (decision.action === "verify") {
    const sealer = credentialSealer(master, c);
    const evidence = sealer.open<Evidence>("evidence", c.sealedEvidence);
    const att = issueAttestation(
      master,
      {
        credentialId: c.id,
        helperId: h.id,
        jurisdiction: c.jurisdiction,
        legalName: evidence.legalName,
        registerNumber: evidence.registerNumber,
      },
      now,
    );
    await db
      .update(credentials)
      .set({
        ...decided,
        status: "verified",
        token: att.token,
        expiresAt: att.expiresAt,
        sealedDisclosures: sealer.seal("disclosures", att.disclosures),
      })
      .where(and(eq(credentials.id, c.id), eq(credentials.status, "pending")));
    return true;
  }
  await db
    .update(credentials)
    .set({
      ...decided,
      status: decision.action === "reject" ? "rejected" : "revoked",
      ...(decision.action === "revoke" ? { sealedDisclosures: null } : {}),
    })
    .where(and(eq(credentials.id, c.id), eq(credentials.status, from)));
  return true;
}

/**
 * What a lawyer hands a client on taking their matter: the name Causius
 * checked, and for each verified admission the token with the disclosures
 * that prove the name is that one. Only ever read for the helper themselves.
 */
export async function disclosureFor(
  db: Db,
  master: Buffer,
  helperId: string,
  now = new Date(),
): Promise<{ legalName: string; attestations: { token: string; disclosures: string[] }[] } | null> {
  const rows = (await credentialsOf(db, [helperId])).filter(
    (c) => c.status === "verified" && c.token && c.sealedDisclosures && c.expiresAt && c.expiresAt > now,
  );
  if (rows.length === 0) return null;
  const opened = rows.map((c) => {
    const sealer = credentialSealer(master, c);
    return {
      evidence: sealer.open<Evidence>("evidence", c.sealedEvidence),
      token: c.token!,
      disclosures: sealer.open<string[]>("disclosures", c.sealedDisclosures!),
    };
  });
  return {
    legalName: opened[0]!.evidence.legalName,
    attestations: opened.map(({ token, disclosures }) => ({ token, disclosures })),
  };
}

/** Is this credential currently good? For the public verifier: a valid signature on a revoked one is not. */
export async function credentialStatus(db: Db, credentialId: string): Promise<CredentialRow["status"] | null> {
  if (!z.uuid().safeParse(credentialId).success) return null;
  const [c] = await db
    .select({ status: credentials.status })
    .from(credentials)
    .where(eq(credentials.id, credentialId));
  return c?.status ?? null;
}
