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

/** The states of the United States (and DC), by USPS code. Proper names, the same in every language here. */
export const US_STATES: Record<string, string> = {
  "US-AL": "Alabama", "US-AK": "Alaska", "US-AZ": "Arizona", "US-AR": "Arkansas", "US-CA": "California",
  "US-CO": "Colorado", "US-CT": "Connecticut", "US-DE": "Delaware", "US-DC": "District of Columbia",
  "US-FL": "Florida", "US-GA": "Georgia", "US-HI": "Hawaii", "US-ID": "Idaho", "US-IL": "Illinois",
  "US-IN": "Indiana", "US-IA": "Iowa", "US-KS": "Kansas", "US-KY": "Kentucky", "US-LA": "Louisiana",
  "US-ME": "Maine", "US-MD": "Maryland", "US-MA": "Massachusetts", "US-MI": "Michigan", "US-MN": "Minnesota",
  "US-MS": "Mississippi", "US-MO": "Missouri", "US-MT": "Montana", "US-NE": "Nebraska", "US-NV": "Nevada",
  "US-NH": "New Hampshire", "US-NJ": "New Jersey", "US-NM": "New Mexico", "US-NY": "New York",
  "US-NC": "North Carolina", "US-ND": "North Dakota", "US-OH": "Ohio", "US-OK": "Oklahoma", "US-OR": "Oregon",
  "US-PA": "Pennsylvania", "US-RI": "Rhode Island", "US-SC": "South Carolina", "US-SD": "South Dakota",
  "US-TN": "Tennessee", "US-TX": "Texas", "US-UT": "Utah", "US-VT": "Vermont", "US-VA": "Virginia",
  "US-WA": "Washington", "US-WV": "West Virginia", "US-WI": "Wisconsin", "US-WY": "Wyoming",
};

/**
 * Where Causius works first: Switzerland, Liechtenstein, the United States.
 * The agent researches any jurisdiction, but these are the ones the pickers
 * lead with and the helpers are recruited for.
 */
export const MARKETS = ["CH", "LI", "US"] as const;

/** Other places a person may still pick: neighbours and where people move from. */
export const COUNTRIES = ["DE", "AT", "FR", "IT", "GB", "ES", "PT", "NL", "BE", "TR", "IN"] as const;

const SUBDIVISIONS: Record<string, Record<string, string>> = { CH: CANTONS, US: US_STATES };

export interface JurisdictionGroup {
  /** "CH", "LI", "US", or "elsewhere". */
  key: string;
  /** The country itself first (federal level), then its subdivisions. */
  codes: string[];
}

/** Every picker's options, in one order: each market with its cantons or states, then elsewhere. */
export const JURISDICTION_GROUPS: JurisdictionGroup[] = [
  ...MARKETS.map((c) => ({ key: c, codes: [c, ...Object.keys(SUBDIVISIONS[c] ?? {})] })),
  { key: "elsewhere", codes: [...COUNTRIES] },
];

/** "CH-ZH" → "Zürich, Switzerland" in the reader's language; "US-CA" → "California, United States". */
export function jurisdictionLabel(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  const region = new Intl.DisplayNames([locale], { type: "region" });
  const [country, sub] = code.split("-");
  const countryName = region.of(country!) ?? country!;
  return sub ? `${SUBDIVISIONS[country!]?.[code] ?? sub}, ${countryName}` : countryName;
}
