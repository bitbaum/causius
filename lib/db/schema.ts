// Accounts: the same tables in every fleet product (@bitbaum/accountkit/auth).
export * from "@bitbaum/accountkit/auth/schema";
import { sql } from "drizzle-orm";
import { CREDENTIAL_KINDS, HELPER_KINDS } from "../professions";
import { bigserial, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Causius's database. Postgres on the box, through Drizzle (fleet STACK.md).
 *
 * A person is a row in `users` (the shared account tables, re-exported below):
 * email and password, a link, a passkey, or OrangeCat, all optional. Where a
 * column says `*_sub`, it holds that user's id. Before accounts moved here it
 * held the OrangeCat actor id; lib/auth/legacy.ts re-keys those rows when the
 * same person signs in again.
 *
 * WHAT IS PLAIN AND WHAT IS SEALED. Every column named `sealed*` holds
 * ciphertext under the matter's own key (lib/crypto.ts): titles, facts,
 * messages, documents, deadline labels, approval details. What stays plain is
 * only what the database must compare or sort: ids, who takes part, statuses,
 * dates, a jurisdiction code. A dump of this database says that someone has a
 * matter in Zürich with a deadline on 30 October — not what it is about.
 */

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey(),
    ownerSub: text("owner_sub").notNull(),
    /** The matter's data key, sealed with the master key. */
    sealedKey: text("sealed_key").notNull(),
    /** { title, summary, area, facts[], hide[] } */
    sealed: text("sealed").notNull(),
    /** ISO 3166 code with an optional subdivision: "CH", "CH-ZH". For matching helpers later. */
    jurisdiction: text("jurisdiction"),
    status: text("status", { enum: ["open", "waiting", "closed"] }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matters_owner_idx").on(t.ownerSub)],
);

/** Who takes part in a matter. Permission is participation (threadkit's rule). */
export const participants = pgTable(
  "participants",
  {
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    sub: text("sub").notNull(),
    role: text("role", { enum: ["owner", "helper", "observer"] }).notNull(),
    /** The name this person goes by in this matter. A pseudonym is normal. */
    alias: text("alias").notNull(),
    /**
     * What this participant is shown. "full" for the owner and for a helper
     * the owner chose to show everything; "anonymised" puts placeholders where
     * the owner's personal details are (lib/helpers/anonymise.ts), in every
     * read the store answers, so no route can forget it.
     */
    sees: text("sees", { enum: ["full", "anonymised"] }).notNull().default("full"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matterId, t.sub] }), index("participants_sub_idx").on(t.sub)],
);

/**
 * The matter's history, append-only: messages between the person, helpers
 * and the agent, and every step the agent took. Never updated, never deleted
 * except with the whole matter.
 */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind", { enum: ["message", "step"] }).notNull(),
    /** A sub, or "agent". */
    actor: text("actor").notNull(),
    sealed: text("sealed").notNull(),
  },
  (t) => [index("events_matter_idx").on(t.matterId, t.id)],
);

/** Deadlines and tasks. The date is plain so "what is due this week" is one query. */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["deadline", "task"] }).notNull(),
    due: date("due"),
    status: text("status", { enum: ["open", "done"] }).notNull().default("open"),
    /** { label, quote? } */
    sealed: text("sealed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_matter_idx").on(t.matterId), index("items_due_idx").on(t.due)],
);

/**
 * Anything that would leave the matter — sending a letter, filing, sharing
 * with someone, signing, paying — waits here for a person to decide. The agent
 * can propose; it cannot act on the world.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    /** { action, summary, documentId? } */
    sealed: text("sealed").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedBySub: text("decided_by_sub"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [index("approvals_matter_idx").on(t.matterId)],
);

/** Documents: the person's own, and drafts the agent wrote. Sealed whole. */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    /** { name, mime, origin: "upload" | "draft" } */
    sealedMeta: text("sealed_meta").notNull(),
    /** The extracted text, sealed. What the agent reads. */
    sealedText: text("sealed_text").notNull(),
    size: integer("size").notNull(),
    createdBySub: text("created_by_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_matter_idx").on(t.matterId)],
);

/**
 * HELPERS: the people (and AI services) who help with a matter. A profile is
 * PUBLIC by design: name or pseudonym, what they do, where and in which
 * languages. So it is plain. What is private about a helper — a lawyer's legal
 * name and register number — lives in `credentials`, sealed.
 *
 * One profile per account: the same account can open matters as a client and
 * help on others as a helper. Which kinds exist and what each may do is
 * lib/professions.ts, not this file.
 */
export const helpers = pgTable(
  "helpers",
  {
    id: uuid("id").primaryKey(),
    sub: text("sub").notNull(),
    kind: text("kind", { enum: HELPER_KINDS }).notNull(),
    /** The public name. A pseudonym is normal. */
    name: text("name").notNull(),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    /** ISO 3166 codes, optionally with a subdivision: "CH", "CH-ZH". */
    jurisdictions: text("jurisdictions").array().notNull().default(sql`'{}'::text[]`),
    areas: text("areas").array().notNull().default(sql`'{}'::text[]`),
    /** BCP 47 primary tags: "de", "fr", "en". */
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    /** Where they are paid: an OrangeCat service, or their own page. */
    serviceUrl: text("service_url"),
    status: text("status", { enum: ["draft", "listed", "paused"] }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("helpers_sub_idx").on(t.sub), index("helpers_status_idx").on(t.status, t.kind)],
);

/**
 * A claim about a helper that Causius checked, and the signed attestation it
 * issued (lib/helpers/attest.ts). The evidence — legal name, register number,
 * where the register can be read — is sealed under the credential's own key;
 * the public sees only the attestation: "admitted in CH-ZH, checked by
 * Causius", with the name hidden behind a salted digest that the helper can
 * open for a client they choose to work with.
 */
export const credentials = pgTable(
  "credentials",
  {
    id: uuid("id").primaryKey(),
    helperId: uuid("helper_id")
      .notNull()
      .references(() => helpers.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: CREDENTIAL_KINDS }).notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    status: text("status", { enum: ["pending", "verified", "rejected", "revoked"] }).notNull().default("pending"),
    sealedKey: text("sealed_key").notNull(),
    /** { legalName, registerNumber, registerUrl, note } */
    sealedEvidence: text("sealed_evidence").notNull(),
    /** The attestation's selective disclosures, sealed: only the helper may hand them on. */
    sealedDisclosures: text("sealed_disclosures"),
    /** The public, signed attestation (SD-JWT, no disclosures attached). */
    token: text("token"),
    /** Why it was refused, to the helper. Written by a reviewer; names nobody. */
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBySub: text("reviewed_by_sub"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("credentials_helper_idx").on(t.helperId), index("credentials_status_idx").on(t.status)],
);

/**
 * A matter's owner asking a helper for help. Accepted, the helper becomes a
 * participant, seeing what the owner chose. The request is sealed with the
 * MATTER's key: it is part of the matter. A lawyer's disclosure (their legal
 * name, provably the one Causius checked) is sealed there too, on acceptance.
 */
export const engagements = pgTable(
  "engagements",
  {
    id: uuid("id").primaryKey(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    helperId: uuid("helper_id")
      .notNull()
      .references(() => helpers.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["requested", "accepted", "declined", "withdrawn", "ended"] })
      .notNull()
      .default("requested"),
    sees: text("sees", { enum: ["full", "anonymised"] }).notNull().default("anonymised"),
    /** { title, area, message }, already anonymised when `sees` says so. */
    sealedRequest: text("sealed_request").notNull(),
    /** { legalName, attestations: [{ token, disclosures }] }, for a lawyer. */
    sealedDisclosure: text("sealed_disclosure"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    index("engagements_matter_idx").on(t.matterId),
    index("engagements_helper_idx").on(t.helperId, t.status),
    // One open request or engagement per matter and helper.
    uniqueIndex("engagements_open_idx")
      .on(t.matterId, t.helperId)
      .where(sql`status in ('requested', 'accepted')`),
  ],
);
