import type { Locale } from "../i18n/routing";

/**
 * The places a matter can be set in, for the picker. Switzerland first, by
 * canton, then neighbours and the rest. A matter without one is fine: the
 * agent asks or infers it and sets it itself.
 *
 * The LAW of each place does not live here and never will: that is Solon's
 * job (law as data). This is only the list of codes a person can pick.
 */
export const CANTONS: Record<string, string> = {
  "CH-ZH": "Zürich",
  "CH-BE": "Bern",
  "CH-LU": "Luzern",
  "CH-UR": "Uri",
  "CH-SZ": "Schwyz",
  "CH-OW": "Obwalden",
  "CH-NW": "Nidwalden",
  "CH-GL": "Glarus",
  "CH-ZG": "Zug",
  "CH-FR": "Fribourg",
  "CH-SO": "Solothurn",
  "CH-BS": "Basel-Stadt",
  "CH-BL": "Basel-Landschaft",
  "CH-SH": "Schaffhausen",
  "CH-AR": "Appenzell Ausserrhoden",
  "CH-AI": "Appenzell Innerrhoden",
  "CH-SG": "St. Gallen",
  "CH-GR": "Graubünden",
  "CH-AG": "Aargau",
  "CH-TG": "Thurgau",
  "CH-TI": "Ticino",
  "CH-VD": "Vaud",
  "CH-VS": "Valais",
  "CH-NE": "Neuchâtel",
  "CH-GE": "Genève",
  "CH-JU": "Jura",
};

/**
 * WHERE CAUSIUS WORKS: one record per country, and nothing else to change.
 * Adding a country is adding its record here, its words under
 * `Home.where.<code>` in each messages file, and listing its code in
 * `MARKETS`: the pickers, the front page and the agent's notes follow. The
 * agent still researches anywhere; a market is where it is offered, tested and
 * staffed with helpers.
 */
export interface Market {
  /** ISO 3166 country code. */
  code: string;
  /** Subdivisions with law of their own, by ISO 3166-2 code. Empty when the country's law is one. */
  regions: Record<string, string>;
  /** The interface languages people there read. */
  languages: readonly Locale[];
  /** What the agent must keep in mind about this legal order. Written for the model, in English. */
  agentNote: string;
}

const SWITZERLAND: Market = {
  code: "CH",
  regions: CANTONS,
  languages: ["de", "fr", "it"],
  agentNote:
    "Switzerland: federal law and the law of the 26 cantons differ; a cantonal tax, permit or procedure is governed by the canton's law, not only by the federal act. Official texts are on fedlex.admin.ch and on each canton's own collection.",
};

const LIECHTENSTEIN: Market = {
  code: "LI",
  regions: {},
  languages: ["de"],
  agentNote:
    "Liechtenstein has its own legal order (official texts on gesetze.li), close to Swiss and Austrian law in places and part of the EEA: do not apply Swiss or Austrian law there unless a Liechtenstein source says it applies.",
};

/** The markets that are switched on, in the order they are shown. */
export const MARKETS: readonly Market[] = [SWITZERLAND, LIECHTENSTEIN];

/** Other places a person may still pick: neighbours, and where people move from and to. */
export const COUNTRIES = ["DE", "AT", "FR", "IT", "GB", "US", "ES", "PT", "NL", "BE", "TR", "IN"] as const;

export function marketOf(code: string | null | undefined): Market | undefined {
  const country = code?.split("-")[0];
  return MARKETS.find((m) => m.code === country);
}

export interface JurisdictionGroup {
  /** A market's country code, or "elsewhere". */
  key: string;
  /** The country itself first (its national level), then its regions. */
  codes: string[];
}

/** Every picker's options, in one order: each market with its regions, then elsewhere. */
export const JURISDICTION_GROUPS: JurisdictionGroup[] = [
  ...MARKETS.map((m) => ({ key: m.code, codes: [m.code, ...Object.keys(m.regions)] })),
  { key: "elsewhere", codes: [...COUNTRIES] },
];

/** "CH-ZH" → "Zürich, Switzerland" in the reader's language; "LI" → "Liechtenstein". */
export function jurisdictionLabel(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  const region = new Intl.DisplayNames([locale], { type: "region" });
  const [country, sub] = code.split("-");
  const countryName = region.of(country!) ?? country!;
  return sub ? `${marketOf(code)?.regions[code] ?? sub}, ${countryName}` : countryName;
}
