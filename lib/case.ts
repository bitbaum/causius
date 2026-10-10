/**
 * The case file — the one shape everything in Causius reads and writes.
 *
 * The AI analysis produces it, the browser stores it, a human helper is handed
 * it, and "Export" writes exactly it to disk. One shape on purpose: a case that
 * can be exported and re-imported belongs to the person it is about, not to us.
 */

/** Who may do what. The line between the last two is the law, not a price tier. */
export type HelperTier = "ai" | "assistant" | "lawyer";

export interface CaseAsk {
  id: string;
  /** What the other side wants, in plain words. */
  text: string;
  /** Things that would satisfy it. */
  evidence: string[];
  done: boolean;
}

export interface CaseText {
  /** BCP-47 tag, e.g. "de", "tr", "fr". */
  lang: string;
  label: string;
  text: string;
}

export interface CaseFile {
  version: 1;
  id: string;
  title: string;
  jurisdiction: string;
  area: string;
  authority: string;
  reference?: string;
  /** ISO dates (YYYY-MM-DD). */
  received?: string;
  deadline?: string;
  summary: string;
  /** What happens if nothing is done. */
  consequence?: string;
  asks: CaseAsk[];
  /** The document itself: original first, then translations. */
  texts: CaseText[];
  draftReply?: CaseText;
  notes: string[];
  recommendedTier: HelperTier;
  tierReason?: string;
  createdAt: string;
}

export const TIER_LABEL: Record<HelperTier, string> = {
  ai: "Causius AI",
  assistant: "Legal assistant",
  lawyer: "Licensed lawyer",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max = 20000): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

function isoDate(v: unknown): string | undefined {
  const s = str(v, 10);
  return s && ISO_DATE.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
}

function text(v: unknown): CaseText | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const body = str(o.text);
  if (!body) return undefined;
  const lang = str(o.lang, 12) ?? "und";
  return { lang, label: str(o.label, 40) ?? lang, text: body };
}

export function newId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turn anything — a model's JSON, an imported file — into a CaseFile, or null.
 *
 * Lenient about what is missing, strict about types: both sources are
 * untrusted, and a case that renders "undefined" as its deadline is worse than
 * one that renders no deadline.
 */
export function parseCase(input: unknown): CaseFile | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const title = str(o.title, 200);
  if (!title) return null;

  const asks: CaseAsk[] = (Array.isArray(o.asks) ? o.asks : []).slice(0, 40).flatMap((a, i) => {
    if (!a || typeof a !== "object") return [];
    const r = a as Record<string, unknown>;
    const t = str(r.text, 1000);
    if (!t) return [];
    const evidence = (Array.isArray(r.evidence) ? r.evidence : [])
      .slice(0, 20)
      .flatMap((e) => str(e, 300) ?? []);
    return [{ id: str(r.id, 40) ?? `a${i + 1}`, text: t, evidence, done: r.done === true }];
  });

  const tier = o.recommendedTier;
  return {
    version: 1,
    id: str(o.id, 60) ?? newId(),
    title,
    jurisdiction: str(o.jurisdiction, 120) ?? "Not stated",
    area: str(o.area, 120) ?? "Not stated",
    authority: str(o.authority, 200) ?? "Not stated",
    reference: str(o.reference, 120),
    received: isoDate(o.received),
    deadline: isoDate(o.deadline),
    summary: str(o.summary, 3000) ?? "",
    consequence: str(o.consequence, 1000),
    asks,
    texts: (Array.isArray(o.texts) ? o.texts : []).slice(0, 8).flatMap((t) => text(t) ?? []),
    draftReply: text(o.draftReply),
    notes: (Array.isArray(o.notes) ? o.notes : []).slice(0, 20).flatMap((n) => str(n, 600) ?? []),
    recommendedTier: tier === "ai" || tier === "assistant" || tier === "lawyer" ? tier : "assistant",
    tierReason: str(o.tierReason, 600),
    createdAt: str(o.createdAt, 40) ?? new Date().toISOString(),
  };
}

/** Whole days from `today` to `deadline`; negative when it has passed. */
export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
