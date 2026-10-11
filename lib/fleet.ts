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

export interface FleetPresence {
  /** Null when the map could not be read: unavailable says unavailable. */
  development: DevelopmentProfile | null;
  identity: FleetIdentity;
  orangecatUrl: string | null;
  solonUrl: string | null;
}

const ABSENT: FleetPresence = {
  development: null,
  identity: { problem: null, solution: null, mission: null, vision: null },
  orangecatUrl: null,
  solonUrl: null,
};

/** Pure, so it is testable against a fixture without the network. */
export function presenceFromMap(map: unknown, slug = FLEET_SLUG): FleetPresence {
  const projects = z.object({ projects: z.array(z.unknown()) }).safeParse(map);
  if (!projects.success) return ABSENT;
  const entry = projects.data.projects
    .map((p) => EntrySchema.safeParse(p))
    .find((p) => p.success && p.data.slug === slug);
  if (!entry?.success) return ABSENT;
  return {
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
