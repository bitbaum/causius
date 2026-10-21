/**
 * What Causius can do, and whether each thing is real today.
 *
 * The one place a status is decided. Pages name capabilities; they never say
 * on their own whether one works, so no page can overstate it (fleet rule:
 * nothing is claimed on a page unless it is true today). Moving a line from
 * `planned` to `available` is a change to this file, in the pull request that
 * makes it true, with a changelog line.
 */
export type CapabilityStatus = "available" | "inDevelopment" | "planned";

export const CAPABILITIES = {
  letters: "available",
  matters: "available",
  approvals: "available",
  models: "available",
  domains: "available",
  marketplace: "available",
  formation: "planned",
  contracts: "planned",
  law: "planned",
  firms: "planned",
} as const satisfies Record<string, CapabilityStatus>;

export type CapabilityKey = keyof typeof CAPABILITIES;

export const CAPABILITY_KEYS = Object.keys(CAPABILITIES) as CapabilityKey[];
