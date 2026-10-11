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

export const COUNTRIES = ["CH", "DE", "AT", "FR", "IT", "LI", "GB", "US", "ES", "PT", "NL", "BE", "TR", "IN"] as const;

/** "CH-ZH" → "Zürich, Switzerland" in the reader's language; "DE" → "Germany". */
export function jurisdictionLabel(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  const region = new Intl.DisplayNames([locale], { type: "region" });
  const [country, sub] = code.split("-");
  const countryName = region.of(country!) ?? country!;
  return sub ? `${CANTONS[code] ?? sub}, ${countryName}` : countryName;
}
