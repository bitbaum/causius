import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { matterSealer, openMatterKey } from "../crypto";
import type { Db } from "../db";
import { engagements, helpers, matters, participants } from "../db/schema";
import { NotAllowed, readCore, type OpenMatter, type Sees } from "../matters/store";
import type { HelperKind } from "../professions";
import { verifyAttestation } from "./attest";
import { anonymiseRequest } from "./request-preview";
import { disclosureFor, helperBySub, publicHelper, Refused } from "./store";

/**
 * A matter's owner asking a helper for help, and the helper's answer.
 *
 * Asking shares only the request — a title, an area and a message, anonymised
 * unless the owner chose otherwise. Accepting makes the helper a participant
 * (permission is participation), seeing exactly what the owner chose. The
 * owner can end it at any time, and the helper's access ends with it.
 *
 * A LAWYER, on accepting, discloses the legal name Causius verified, with the
 * attestation that proves it is that name (lib/helpers/attest.ts). The client
 * learns who they are working with; the public never does.
 */

export const RequestInput = z.object({
  helperId: z.uuid(),
  message: z.string().trim().min(1).max(4000),
  sees: z.enum(["anonymised", "full"]).default("anonymised"),
});
export type RequestInput = z.input<typeof RequestInput>;

type Status = (typeof engagements.$inferSelect)["status"];

export interface EngagementView {
  id: string;
  status: Status;
  sees: Sees;
  createdAt: string;
  decidedAt: string | null;
  helper: { id: string; name: string; kind: HelperKind };
  /** For the owner, once a lawyer accepted: the verified name, and whether the proof checks out now. */
  disclosure?: {
    legalName: string;
    verified: { jurisdiction: string; ok: boolean }[];
    /** So the owner can check it anywhere, without Causius: the token and its disclosures. */
    attestations: { token: string; disclosures: string[] }[];
  };
}

export interface HelperRequestView {
  id: string;
  matterId: string;
  status: Status;
  sees: Sees;
  createdAt: string;
  request: { title: string; area: string; message: string; jurisdiction: string | null };
}

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

/** The owner asks a listed helper to help with their matter. */
export async function requestHelp(db: Db, m: OpenMatter, ownerSub: string, input: RequestInput): Promise<string> {
  if (m.role !== "owner") throw new NotAllowed("only the owner brings someone in");
  const data = RequestInput.parse(input);
  const helper = await publicHelper(db, data.helperId);
  if (!helper) throw new Refused("helper_unavailable");
  const [h] = await db.select({ sub: helpers.sub }).from(helpers).where(eq(helpers.id, data.helperId));
  if (h!.sub === ownerSub) throw new Refused("own_profile");

  const core = await readCore(db, m);
  const [row] = await db.select({ jurisdiction: matters.jurisdiction }).from(matters).where(eq(matters.id, m.id));
  const plain = { title: core.title, area: core.area, message: data.message, jurisdiction: row!.jurisdiction };
  const shown = data.sees === "anonymised" ? { ...plain, ...anonymiseRequest(plain, core.hide) } : plain;
  const id = randomUUID();
  const inserted = await db
    .insert(engagements)
    .values({ id, matterId: m.id, helperId: data.helperId, sees: data.sees, sealedRequest: m.sealer.seal("request", shown) })
    .onConflictDoNothing()
    .returning({ id: engagements.id });
  if (inserted.length === 0) throw new Refused("already_asked");
  return id;
}

/** Everyone asked or working on this matter, for its participants. */
export async function matterEngagements(
  db: Db,
  master: Buffer,
  m: OpenMatter,
  now = new Date(),
): Promise<EngagementView[]> {
  const rows = await db
    .select({ e: engagements, h: helpers })
    .from(engagements)
    .innerJoin(helpers, eq(helpers.id, engagements.helperId))
    .where(eq(engagements.matterId, m.id))
    .orderBy(desc(engagements.createdAt));
  return rows.map(({ e, h }) => {
    const view: EngagementView = {
      id: e.id,
      status: e.status,
      sees: e.sees,
      createdAt: iso(e.createdAt),
      decidedAt: e.decidedAt ? iso(e.decidedAt) : null,
      helper: { id: h.id, name: h.name, kind: h.kind },
    };
    if (m.role === "owner" && e.sealedDisclosure && e.status === "accepted") {
      const d = m.sealer.open<{ legalName: string; attestations: { token: string; disclosures: string[] }[] }>(
        "disclosure",
        e.sealedDisclosure,
      );
      view.disclosure = {
        legalName: d.legalName,
        verified: d.attestations.map((a) => checkDisclosure(master, a, d.legalName, now)),
        attestations: d.attestations,
      };
    }
    return view;
  });
}

function checkDisclosure(
  master: Buffer,
  a: { token: string; disclosures: string[] },
  legalName: string,
  now: Date,
): { jurisdiction: string; ok: boolean } {
  const r = verifyAttestation(master, a.token, a.disclosures, now);
  return r.ok
    ? { jurisdiction: r.jurisdiction, ok: r.disclosed.legal_name === legalName }
    : { jurisdiction: "", ok: false };
}

/**
 * The owner withdraws a request, or ends an engagement. The helper stops
 * being a participant in the same transaction: no window where they can read
 * a matter they no longer work on.
 */
export async function endEngagement(db: Db, m: OpenMatter, engagementId: string): Promise<boolean> {
  if (m.role !== "owner") throw new NotAllowed("only the owner ends it");
  if (!z.uuid().safeParse(engagementId).success) return false;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ e: engagements, sub: helpers.sub })
      .from(engagements)
      .innerJoin(helpers, eq(helpers.id, engagements.helperId))
      .where(and(eq(engagements.id, engagementId), eq(engagements.matterId, m.id)));
    if (!row || !["requested", "accepted"].includes(row.e.status)) return false;
    await tx
      .update(engagements)
      .set({ status: row.e.status === "requested" ? "withdrawn" : "ended", decidedAt: new Date() })
      .where(eq(engagements.id, engagementId));
    await tx
      .delete(participants)
      .where(and(eq(participants.matterId, m.id), eq(participants.sub, row.sub), eq(participants.role, "helper")));
    return true;
  });
}

/** The requests sent to the caller's helper profile, newest first. */
export async function helperRequests(db: Db, master: Buffer, sub: string): Promise<HelperRequestView[]> {
  const h = await helperBySub(db, sub);
  if (!h) return [];
  const rows = await db
    .select({ e: engagements, sealedKey: matters.sealedKey })
    .from(engagements)
    .innerJoin(matters, eq(matters.id, engagements.matterId))
    .where(and(eq(engagements.helperId, h.id), inArray(engagements.status, ["requested", "accepted"])))
    .orderBy(desc(engagements.createdAt))
    .limit(200);
  return rows.map(({ e, sealedKey }) => {
    const sealer = matterSealer(openMatterKey(master, sealedKey, e.matterId), e.matterId);
    return {
      id: e.id,
      matterId: e.matterId,
      status: e.status,
      sees: e.sees,
      createdAt: iso(e.createdAt),
      request: sealer.open<HelperRequestView["request"]>("request", e.sealedRequest),
    };
  });
}

/**
 * The helper answers. Accepting adds them to the matter under their public
 * name, seeing what the owner chose; a lawyer's verified name goes to the
 * owner with it. Declining leaves the matter untouched.
 */
export async function answerRequest(
  db: Db,
  master: Buffer,
  sub: string,
  engagementId: string,
  answer: "accept" | "decline",
): Promise<string | null> {
  if (!z.uuid().safeParse(engagementId).success) return null;
  const h = await helperBySub(db, sub);
  if (!h) return null;
  const [row] = await db
    .select({ e: engagements, sealedKey: matters.sealedKey })
    .from(engagements)
    .innerJoin(matters, eq(matters.id, engagements.matterId))
    .where(and(eq(engagements.id, engagementId), eq(engagements.helperId, h.id)));
  if (!row) return null;
  if (row.e.status !== "requested") throw new Refused("already_answered");
  const { e } = row;

  if (answer === "decline") {
    await db
      .update(engagements)
      .set({ status: "declined", decidedAt: new Date() })
      .where(and(eq(engagements.id, e.id), eq(engagements.status, "requested")));
    return e.matterId;
  }

  const sealer = matterSealer(openMatterKey(master, row.sealedKey, e.matterId), e.matterId);
  const disclosure = h.kind === "lawyer" ? await disclosureFor(db, master, h.id) : null;
  if (h.kind === "lawyer" && !disclosure) throw new Refused("needs_verification");
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(engagements)
      .set({
        status: "accepted",
        decidedAt: new Date(),
        sealedDisclosure: disclosure ? sealer.seal("disclosure", disclosure) : null,
      })
      .where(and(eq(engagements.id, e.id), eq(engagements.status, "requested")))
      .returning({ id: engagements.id });
    if (updated.length === 0) throw new Refused("already_answered");
    await tx
      .insert(participants)
      .values({ matterId: e.matterId, sub, role: "helper", alias: h.name, sees: e.sees })
      .onConflictDoNothing();
  });
  return e.matterId;
}

/** A helper steps away from a matter they work on. */
export async function leaveMatter(db: Db, m: OpenMatter, sub: string): Promise<boolean> {
  if (m.role !== "helper") throw new NotAllowed("only a helper leaves");
  const h = await helperBySub(db, sub);
  return db.transaction(async (tx) => {
    if (h)
      await tx
        .update(engagements)
        .set({ status: "ended", decidedAt: new Date() })
        .where(and(eq(engagements.matterId, m.id), eq(engagements.helperId, h.id), eq(engagements.status, "accepted")));
    const gone = await tx
      .delete(participants)
      .where(and(eq(participants.matterId, m.id), eq(participants.sub, sub), eq(participants.role, "helper")))
      .returning({ sub: participants.sub });
    return gone.length === 1;
  });
}
