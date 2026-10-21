import { createSearch, type SearchSpec } from "@bitbaum/searchkit";
import type { ListSpec } from "listkit";
import { HELPER_AREAS, HELPER_KINDS, HELPER_LANGUAGES } from "../professions";
import type { PublicHelper } from "./store";

/**
 * The directory as a list. listkit owns what the list IS — its filters and how
 * they live in the URL, so a filtered view can be shared — and searchkit owns
 * finding who was meant, so "advocta nrd" still finds "Advocata Nord". Pure,
 * so the page only draws and the typo suite runs in node.
 */

/** The country of every place a helper works in: "CH-ZH" counts as "CH". */
export const countriesOf = (h: PublicHelper) => [...new Set(h.jurisdictions.map((j) => j.slice(0, 2)))];

export const DIRECTORY: ListSpec<PublicHelper> = {
  facets: [
    { key: "kind", kind: "many", value: (h) => h.kind, options: HELPER_KINDS },
    { key: "place", kind: "many", value: countriesOf },
    { key: "lang", kind: "many", value: (h) => h.languages, options: HELPER_LANGUAGES },
    { key: "area", kind: "many", value: (h) => h.areas, options: HELPER_AREAS },
  ],
  // Lawyers with the most verified places first, then by name: no ranking we
  // could not explain (no ratings exist, and none are invented).
  sorts: [{ key: "name", by: [(h) => -h.attestations.length, (h) => h.name.toLowerCase()] }],
  defaultSort: "name",
  defaultDir: "asc",
  defaultPageSize: 30,
};

export const SEARCH: SearchSpec<PublicHelper> = {
  fields: [
    { name: "name", get: (h) => h.name },
    { name: "headline", get: (h) => h.headline },
    { name: "bio", get: (h) => h.bio },
  ],
};

/** The helpers matching what was typed, best match first; everyone when nothing was. */
export function searchHelpers(helpers: readonly PublicHelper[], q: string): PublicHelper[] {
  if (!q.trim()) return [...helpers];
  return createSearch(helpers, SEARCH)
    .search(q)
    .map((hit) => hit.item);
}
