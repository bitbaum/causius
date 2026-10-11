import { z } from "zod";

/**
 * Is a domain name registered? Asked of the registry itself, over RDAP.
 *
 * Founding something — a company, an association, a project — starts with a
 * name, and a name is only usable if its domain is free. This answers that
 * question from the authority, not from a reseller's search box (which can
 * show a "taken" name as free to sell a backorder, or the reverse):
 *
 *   1. IANA's RDAP bootstrap file names the registry server for each TLD.
 *   2. That server answers 200 for a registered name and 404 for one it does
 *      not hold. Nothing else counts as an answer.
 *
 * "Not registered" is not "yours to register": a registry can reserve a name
 * or price it as premium. The result says exactly what the registry said, and
 * registering stays a step the person takes (or approves) themselves.
 *
 * Pure apart from `fetchImpl`, so it is tested without the network.
 */

export const IANA_RDAP_BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

export type DomainStatus = "registered" | "not_registered" | "unknown" | "invalid";

export interface DomainResult {
  name: string;
  status: DomainStatus;
  /** The registry that answered, when one did. */
  registry: string | null;
}

/** LDH labels, 2–63 chars per label, at least one dot, an alphabetic TLD. Punycode is fine. */
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export function normaliseDomain(input: string): string | null {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
  return DOMAIN.test(name) ? name : null;
}

const Bootstrap = z.object({
  services: z.array(z.tuple([z.array(z.string()), z.array(z.string())])),
});

export type RdapServers = Map<string, string>;

/** TLD → the registry's RDAP base URL (https only, with a trailing slash). */
export function serversFromBootstrap(json: unknown): RdapServers {
  const map: RdapServers = new Map();
  const parsed = Bootstrap.safeParse(json);
  if (!parsed.success) return map;
  for (const [tlds, urls] of parsed.data.services) {
    const base = urls.find((u) => u.startsWith("https://"));
    if (!base) continue;
    for (const tld of tlds) map.set(tld.toLowerCase(), base.endsWith("/") ? base : `${base}/`);
  }
  return map;
}

const TIMEOUT_MS = 8_000;
let bootstrap: { until: number; servers: Promise<RdapServers> } | null = null;

/** The bootstrap file changes rarely; one copy per process per day. */
function loadServers(fetchImpl: typeof fetch): Promise<RdapServers> {
  if (bootstrap && bootstrap.until > Date.now()) return bootstrap.servers;
  const servers = fetchImpl(IANA_RDAP_BOOTSTRAP, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((r) => (r.ok ? r.json() : null))
    .then(serversFromBootstrap)
    .catch(() => new Map() as RdapServers);
  // A failed load is retried after a minute, not a day.
  bootstrap = { until: Date.now() + 60_000, servers };
  void servers.then((s) => {
    if (bootstrap?.servers === servers && s.size > 0) bootstrap.until = Date.now() + 86_400_000;
  });
  return servers;
}

/** For tests. */
export function resetRdapCache() {
  bootstrap = null;
}

export async function checkDomain(input: string, fetchImpl: typeof fetch = fetch): Promise<DomainResult> {
  const name = normaliseDomain(input);
  if (!name) return { name: input.trim().slice(0, 253), status: "invalid", registry: null };
  const servers = await loadServers(fetchImpl);
  // The longest suffix the bootstrap knows: "co.uk" is not delegated separately
  // today, but the lookup must not assume that.
  const labels = name.split(".");
  let base: string | undefined;
  for (let i = 1; i < labels.length && !base; i++) base = servers.get(labels.slice(i).join("."));
  if (!base) return { name, status: "unknown", registry: null };
  const registry = new URL(base).host;
  try {
    const r = await fetchImpl(`${base}domain/${encodeURIComponent(name)}`, {
      headers: { accept: "application/rdap+json" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status === 200) return { name, status: "registered", registry };
    if (r.status === 404) return { name, status: "not_registered", registry };
    return { name, status: "unknown", registry };
  } catch {
    return { name, status: "unknown", registry };
  }
}

/** Several names at once, in order, a few at a time so no registry is hammered. */
export async function checkDomains(names: string[], fetchImpl: typeof fetch = fetch): Promise<DomainResult[]> {
  const out: DomainResult[] = [];
  for (let i = 0; i < names.length; i += 4) {
    out.push(...(await Promise.all(names.slice(i, i + 4).map((n) => checkDomain(n, fetchImpl)))));
  }
  return out;
}

export function describeDomain(r: DomainResult): string {
  switch (r.status) {
    case "registered":
      return `${r.name}: registered (per ${r.registry})`;
    case "not_registered":
      return `${r.name}: not registered (per ${r.registry}); the registry may still reserve or price it, so registering is the real test`;
    case "invalid":
      return `${r.name}: not a valid domain name`;
    default:
      return `${r.name}: unknown — the registry did not give a clear answer${r.registry ? ` (${r.registry})` : ""}`;
  }
}
