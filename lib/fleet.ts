import { developmentProfileFromMap, type DevelopmentProfile } from "bip-kit";
import { z } from "zod";

/**
 * What this product IS, read from where that fact is produced.
 *
 * Fleet AGENTS.md, "The identity contract": problem, solution, mission, vision,
 * roadmap and changelog have one producer — the Loki project profile, published
 * on the fleet map. A product site RENDERS them; it does not author them.
 * The roadmap and changelog are kept in this repository (ROADMAP.md,
 * CHANGELOG.md); Loki ingests them and this site reads the map back, so there
 * is no local copy for a page to drift from. Same shape as Solon's
 * `development-records.ts`.
 *
 * The same entry says whether the product has an OrangeCat profile (how it is
 * funded and found) and a Solon organisation (how it is governed). A link to
 * either is rendered only when the map reports one — a "Governed on Solon"
 * link to an organisation nobody founded would be a claim, not a fact.
 */
export const FLEET_MAP_URL = "https://loki.orangecat.ch/api/fleet/map";
export const FLEET_SLUG = "causius";
export const FLEET_PROFILE_URL = `https://loki.orangecat.ch/fleet/${FLEET_SLUG}`;

/** The map is cached five minutes on the producer; ask for it no more often. */
const REVALIDATE_SECONDS = 300;
/** A map slower than this is treated as unavailable, not awaited. */
const TIMEOUT_MS = 4_000;

const nullableText = z.string().trim().min(1).nullable().catch(null);
const nullableUrl = z.url({ protocol: /^https$/ }).nullable().catch(null);

const EntrySchema = z.object({
  slug: z.string(),
  identity: z
    .object({
      problem: nullableText,
      solution: nullableText,
      mission: nullableText,
      vision: nullableText,
    })
    .catch({ problem: null, solution: null, mission: null, vision: null }),
  urls: z
    .object({ orangecat: nullableUrl, solon: nullableUrl })
    .catch({ orangecat: null, solon: null }),
});

export type FleetIdentity = z.output<typeof EntrySchema>["identity"];

/**
 * The layers Causius stands on — OrangeCat, Loki, Solon — as the map states
 * them. Fleet AGENTS.md: "A page that types the portfolio is a copy. Generate
 * it, or do not ship it." So the ecosystem section renders these, and renders
 * nothing when the map cannot be read.
 */
const PillarSchema = z.object({ slug: z.string(), layer: z.string(), role: z.string().trim().min(1) });
const ProjectSchema = z.object({
  slug: z.string(),
  name: z.string().trim().min(1),
  what: nullableText,
  urls: z.object({ live: nullableUrl }).catch({ live: null }),
});

export interface FleetPillar {
  slug: string;
  layer: string;
  name: string;
  role: string;
  what: string | null;
  url: string | null;
}

export interface FleetPresence {
  /** Null when the map could not be read: unavailable says unavailable. */
  development: DevelopmentProfile | null;
  identity: FleetIdentity;
  orangecatUrl: string | null;
  solonUrl: string | null;
  /** The fleet's pillars, in the map's order; empty when it could not be read. */
  pillars: FleetPillar[];
}

const ABSENT: FleetPresence = {
  development: null,
  identity: { problem: null, solution: null, mission: null, vision: null },
  orangecatUrl: null,
  solonUrl: null,
  pillars: [],
};

export function pillarsFromMap(map: unknown): FleetPillar[] {
  const parsed = z
    .object({ pillars: z.array(z.unknown()).catch([]), projects: z.array(z.unknown()).catch([]) })
    .safeParse(map);
  if (!parsed.success) return [];
  const projects = parsed.data.projects.flatMap((p) => {
    const r = ProjectSchema.safeParse(p);
    return r.success ? [r.data] : [];
  });
  return parsed.data.pillars.flatMap((raw) => {
    const pillar = PillarSchema.safeParse(raw);
    if (!pillar.success) return [];
    const project = projects.find((p) => p.slug === pillar.data.slug);
    if (!project) return [];
    return [{ ...pillar.data, name: project.name, what: project.what, url: project.urls.live }];
  });
}

/** Pure, so it is testable against a fixture without the network. */
export function presenceFromMap(map: unknown, slug = FLEET_SLUG): FleetPresence {
  const projects = z.object({ projects: z.array(z.unknown()) }).safeParse(map);
  if (!projects.success) return ABSENT;
  const entry = projects.data.projects
    .map((p) => EntrySchema.safeParse(p))
    .find((p) => p.success && p.data.slug === slug);
  if (!entry?.success) return { ...ABSENT, pillars: pillarsFromMap(map) };
  return {
    pillars: pillarsFromMap(map),
    development: developmentProfileFromMap(map, slug),
    identity: entry.data.identity,
    orangecatUrl: entry.data.urls.orangecat,
    solonUrl: entry.data.urls.solon,
  };
}

/**
 * Remembered per process, failures included. The layout calls this on every
 * render, and a page that is rendered on demand (a case page) would otherwise
 * wait out the full timeout on every request while the map is down — the
 * product stalling because a page ABOUT the product is unreachable. A miss is
 * retried after a minute; a hit is kept as long as the producer caches it.
 */
const MISS_SECONDS = 60;
let remembered: { until: number; value: Promise<FleetPresence> } | null = null;

async function fetchFleetPresence(): Promise<{ value: FleetPresence; ok: boolean }> {
  try {
    const response = await fetch(FLEET_MAP_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { value: ABSENT, ok: false };
    return { value: presenceFromMap(await response.json()), ok: true };
  } catch {
    return { value: ABSENT, ok: false };
  }
}

export function loadFleetPresence(): Promise<FleetPresence> {
  const now = Date.now();
  if (remembered && remembered.until > now) return remembered.value;
  const attempt = fetchFleetPresence();
  // Concurrent renders share the one request; the expiry is set when it lands.
  const entry = { until: now + TIMEOUT_MS + 1000, value: attempt.then((r) => r.value) };
  remembered = entry;
  void attempt.then((r) => {
    entry.until = Date.now() + (r.ok ? REVALIDATE_SECONDS : MISS_SECONDS) * 1000;
  });
  return entry.value;
}
