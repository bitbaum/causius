/**
 * Anonymisation of a letter BEFORE it leaves the reader's browser.
 *
 * The model needs what a letter asks for and by when. It does not need who the
 * letter is about. So names, addresses, account and identity numbers, phone
 * numbers and e-mail addresses are swapped for placeholders like `[NAME-1]` in
 * the browser, the model reads and answers with the placeholders, and the
 * browser puts the real values back into the result. The table of what each
 * placeholder stands for never leaves the device.
 *
 * Detection is deliberately generous: hiding a word too many costs a slightly
 * vaguer analysis; hiding one too few sends a person's details to a model
 * provider. The reader sees every replacement before sending, can switch any
 * of them off, and can add words of their own (their name, their employer).
 *
 * Pure functions, no DOM, so they are unit-tested in node.
 */

export type RedactionKind =
  | "NAME"
  | "ADDRESS"
  | "POSTCODE"
  | "EMAIL"
  | "PHONE"
  | "IBAN"
  | "AHV"
  | "REF"
  | "BIRTHDATE";

export interface Redaction {
  /** The placeholder sent instead, e.g. `[NAME-1]`. */
  token: string;
  /** What it stands for. Stays in the browser. */
  value: string;
  kind: RedactionKind;
}

/**
 * Text as it is matched. Letters pasted from a PDF or a Mac arrive with accents
 * written as a base letter plus a combining mark, soft hyphens inside words,
 * zero-width characters and non-breaking spaces; none of those are visible and
 * every one of them stops a pattern from matching the name it sits in. Both
 * finding and hiding go through this first, so they always agree.
 */
export function normalizeForMatching(text: string): string {
  return text
    .replace(/[­​-‏⁠﻿]/g, "")
    .normalize("NFC")
    .replace(/[    ]/g, " ");
}

/** A word written in either case: `ci("rue")` matches rue, Rue and RUE. */
const ci = (word: string): string =>
  [...word]
    .map((c) =>
      /\p{L}/u.test(c)
        ? `[${c.toLowerCase()}${c.toUpperCase()}]`
        : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");

// Every quantifier below is bounded. An unbounded `+` inside a pattern that is
// tried from every position is quadratic: 100 000 capital letters took 23 s.
/** A capitalised word in any of the languages letters arrive in. */
const WORD = String.raw`\p{Lu}[\p{L}'’-]{1,40}`;
/** An initial: "E." */
const INITIAL = String.raw`\p{Lu}\.`;
/** Space within one line. A name or an address never continues on the next. */
const SP = String.raw`[ \t]+`;
const NAMEPART = String.raw`(?:${WORD}|${INITIAL})`;
/** Up to three name parts: "Erika", "E. Muster", "Jean-Luc de la Tour". */
const NAME = String.raw`${NAMEPART}(?:${SP}(?:(?:von|van|de|del|della|di|du|da|la|le)${SP})?${NAMEPART}){0,2}`;
/** Academic and professional titles that sit between "Herr" and the name. */
const TITLES = String.raw`(?:(?:Prof|Dr|Dipl|Ing|lic|iur|med|phil|rer|nat|MLaw|MSc|BSc|Mag|Fürsprecher)\.?${SP}){0,4}`;
const SALUTATION = String.raw`(?:Herrn?|HERRN?|Frau|FRAU|Familie|FAMILIE|Mr\.?|Mrs\.?|Ms\.?|Miss|Monsieur|MONSIEUR|Madame|MADAME|Mademoiselle|M\.|Mme|Mlle|Signor[ae]?|SIGNOR[AE]?|Sig\.(?:ra)?|Dr\.|Prof\.)`;

const STREET_SUFFIXES = [
  "strasse",
  "straße",
  "str.",
  "gasse",
  "weg",
  "platz",
  "allee",
  "rain",
  "ring",
  "hof",
  "halde",
  "matt",
  "graben",
];
const STREET_PREFIXES = [
  "Rue",
  "Avenue",
  "Av.",
  "Chemin",
  "Ch.",
  "Route",
  "Rte",
  "Place",
  "Boulevard",
  "Bd",
  "Quai",
  "Impasse",
  "Via",
  "Viale",
  "Piazza",
];
const PARTICLE = String.raw`(?:(?:de|du|des|de la|de l'|della|del)${SP})?`;
const STREET = String.raw`${WORD}(?:${STREET_SUFFIXES.map(ci).join("|")})${SP}\d{1,4}[a-zA-Z]?\b|(?:${STREET_PREFIXES.map(ci).join("|")})${SP}${PARTICLE}${WORD}(?:${SP}${WORD})?${SP}\d{1,4}[a-zA-Z]?\b|\d{1,4}[a-zA-Z]?,?${SP}(?:${STREET_PREFIXES.map(ci).join("|")})${SP}${PARTICLE}${WORD}(?:${SP}${WORD})?`;
const POBOX = String.raw`(?:Postfach|POSTFACH|Case postale|CASE POSTALE|Casella postale|P\.?O\.? Box)${SP}\d{1,6}`;
const ADDRESS_LINE = String.raw`(?:${STREET}|${POBOX})`;

interface Rule {
  kind: RedactionKind;
  /** Must have a capturing group 1: the part that is hidden. */
  pattern: RegExp;
  /** A match for which this says yes is left alone (an authority is not a person). */
  skip?: (value: string) => boolean;
}

/**
 * Names of authorities, firms and bodies. A letter's sender is who the model
 * must know about; hiding "Kantonales Steueramt" would cost the analysis its
 * subject, so a bare line that looks like an organisation is not a person.
 */
const ORG_WORDS = new Set([
  "ag",
  "gmbh",
  "sa",
  "sarl",
  "sàrl",
  "ltd",
  "inc",
  "llc",
  "post",
  "poste",
  "service",
  "office",
  "bureau",
  "court",
  "council",
  "insurance",
  "department",
]);
const ORG_SUFFIXES = [
  "amt",
  "gericht",
  "bank",
  "banque",
  "banca",
  "versicherung",
  "assurance",
  "assicurazione",
  "stiftung",
  "fondation",
  "verein",
  "kanton",
  "canton",
  "cantone",
  "stadt",
  "gemeinde",
  "commune",
  "comune",
  "departement",
  "département",
  "direktion",
  "verwaltung",
  "kasse",
  "caisse",
  "polizei",
  "police",
  "spital",
  "hôpital",
  "ospedale",
  "universität",
  "université",
  "schule",
  "école",
  "kirche",
  "tribunal",
  "tribunale",
  "ufficio",
  "behörde",
  "inspektorat",
  "sekretariat",
  "secrétariat",
  "kanzlei",
  "steuern",
  "impôts",
  "migration",
];
function looksLikeOrganisation(value: string): boolean {
  return value
    .toLowerCase()
    .split(/\s+/)
    .some((w) => ORG_WORDS.has(w) || ORG_SUFFIXES.some((s) => w.endsWith(s)));
}

/**
 * Order matters only for overlapping finds: earlier rules win. Specific
 * numbers come before the loose name patterns so that "IBAN CH93 …" is an
 * IBAN, not a name.
 */
const RULES: Rule[] = [
  // The lookbehind keeps the scan from starting inside a run it has already read.
  {
    kind: "EMAIL",
    pattern:
      /(?<![\p{L}\d._%+-])([\p{L}\d._%+-]{1,64}@[\p{L}\d.-]{1,255}\.\p{L}{2,24})/gu,
  },
  // Swiss social security number, with or without dots.
  { kind: "AHV", pattern: /\b(756[.\s]?\d{4}[.\s]?\d{4}[.\s]?\d{2})\b/g },
  // IBAN: country, check digits, then groups of four. Either case.
  {
    kind: "IBAN",
    pattern:
      /\b([A-Za-z]{2}\d{2}(?:[ ]?[A-Za-z0-9]{4}){2,7}(?:[ ]?[A-Za-z0-9]{1,3})?)\b/g,
  },
  // Phone numbers: international, Swiss or French national, with or without separators.
  {
    kind: "PHONE",
    pattern:
      /(?<![\w.])((?:\+|00)\d{2}[\s./-]?(?:\(0\))?\d{1,3}(?:[\s./-]?\d{2,4}){2,4}|0\d{2}[\s./-]\d{3}[\s./-]\d{2}[\s./-]\d{2}|0\d(?:[ .]\d{2}){4}|0[1-9]\d{8}|0\d{2,4}[ /-]\d{4,8}(?:-\d{1,4})?)(?![\w.])/g,
  },
  // A date of birth, where the letter labels it as one…
  {
    kind: "BIRTHDATE",
    pattern:
      /(?:geb\.|geboren(?:\s+am)?|Geburtsdatum:?|n[ée]e?\s+le|date\s+de\s+naissance:?|date\s+of\s+birth:?|born(?:\s+on)?|DOB:?)\s*(\d{1,2}[./-]\s?\d{1,2}[./-]\s?\d{2,4}|\d{1,2}\.?\s+\p{L}+\s+\d{4})/giu,
  },
  // …or labels it after the date: "am 01.02.1980 geboren".
  {
    kind: "BIRTHDATE",
    pattern:
      /(\d{1,2}[./-]\d{1,2}[./-]\d{4})(?=[ \t]+(?:geboren|geb\.|born|n[ée]e?\b))/giu,
  },
  // Reference and file numbers, where the letter labels them. The label stays:
  // the model should know a reference exists, not what it is.
  {
    kind: "REF",
    pattern:
      /(?:ZEMIS(?:[- ]?Nr\.?)?|Ref(?:erenz)?(?:[- ]?Nr)?\.?|Kant\.?\s*Ref\.?\s*Nr\.?|Dossier(?:[- ]?Nr\.?)?|Aktenzeichen|Gesch(?:äfts|afts)[- ]?Nr\.?|Kunden[- ]?Nr\.?|Versicherten[- ]?Nr\.?|N°|No\.|Nr\.|Référence|Case\s+(?:no\.|number))\s*:?\s*((?:[A-Z]{1,4}[\s-]?)?\d[\dA-Z./-]{2,}(?:[ \t-][A-Z]{0,4}\d[\dA-Z./-]*){0,3})/giu,
  },
  // "c/o Hans Beispiel" — the person a letter is sent through.
  { kind: "NAME", pattern: new RegExp(String.raw`c\/o${SP}(${NAME})`, "gu") },
  // The addressee in a salutation or address block, after any academic title.
  {
    kind: "NAME",
    pattern: new RegExp(
      String.raw`${SALUTATION}(?:${SP}|\n[ \t]*)${TITLES}(${NAME})`,
      "gu",
    ),
  },
  // A street and house number, or a post office box, in German, French or Italian form.
  { kind: "ADDRESS", pattern: new RegExp(String.raw`(${ADDRESS_LINE})`, "gu") },
  // A name on a line of its own directly above an address line: the recipient's
  // block, written without "Herr" or "Frau".
  {
    kind: "NAME",
    pattern: new RegExp(
      String.raw`^[ \t]*(${NAME})[ \t]*(?=\n[ \t]*${ADDRESS_LINE})`,
      "gmu",
    ),
    skip: looksLikeOrganisation,
  },
  // The signer: the line after the closing. The authority under it is not hidden.
  {
    kind: "NAME",
    pattern: new RegExp(
      String.raw`(?:Gr(?:ü|ue)ss(?:e|en)?|salutations|Cordialement|regards|Sincerely|saluti)[ \t]*,?[ \t]*\n(?:[ \t]*\n)?[ \t]*(${NAME})[ \t]*$`,
      "gmu",
    ),
    skip: looksLikeOrganisation,
  },
  // A postcode and town at the start of a line, as in an address block. Only
  // at the start of a line: "2026 Zur Behandlung" in running text is a year.
  {
    kind: "POSTCODE",
    pattern: new RegExp(
      String.raw`^[ \t]*((?:CH-)?\d{4,5}${SP}${WORD}(?:${SP}${WORD})?)[ \t]*$`,
      "gmu",
    ),
  },
];

const TOKEN =
  /\[(NAME|ADDRESS|POSTCODE|EMAIL|PHONE|IBAN|AHV|REF|BIRTHDATE)-(\d+)\]/g;
/** The same, as a splitter that keeps each placeholder as its own segment. */
const PLACEHOLDER =
  /(\[(?:NAME|ADDRESS|POSTCODE|EMAIL|PHONE|IBAN|AHV|REF|BIRTHDATE)-\d+\])/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every distinct value worth hiding, in the order found. */
export function findPersonalData(
  input: string,
  ownWords: string[] = [],
): Omit<Redaction, "token">[] {
  const text = normalizeForMatching(input);
  const found = new Map<string, RedactionKind>();
  const add = (value: string, kind: RedactionKind) => {
    const v = normalizeForMatching(value).trim().replace(/\s+/g, " ");
    if (v.length >= 2 && !found.has(v)) found.set(v, kind);
  };

  for (const word of ownWords) add(word, "NAME");
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (match[1] && !rule.skip?.(match[1])) add(match[1], rule.kind);
    }
  }
  // A name found once is hidden everywhere, and so is each part of it: a
  // letter that says "Herr Hans Muster" also says "Muster" on its own later.
  for (const [value, kind] of [...found]) {
    if (kind !== "NAME") continue;
    for (const part of value.split(/\s+/)) {
      if (part.length >= 3 && /^\p{Lu}/u.test(part)) add(part, "NAME");
    }
  }
  return [...found].map(([value, kind]) => ({ value, kind }));
}

/** Give each value its placeholder: `[NAME-1]`, `[NAME-2]`, `[EMAIL-1]`… */
export function assignTokens(values: Omit<Redaction, "token">[]): Redaction[] {
  const counts = new Map<RedactionKind, number>();
  return values.map(({ value, kind }) => {
    const n = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, n);
    return { value, kind, token: `[${kind}-${n}]` };
  });
}

/**
 * Replace every redacted value with its placeholder. Longest value first, so
 * "Erika Muster" becomes one placeholder rather than "[NAME-2] [NAME-3]".
 * Case-insensitive, whole words only.
 */
export function applyRedactions(
  input: string,
  redactions: Redaction[],
): string {
  // Segments that already are placeholders are never touched, whatever the
  // person asked to hide: a hidden word like "12" must not turn `[REF-12]`
  // into something that no longer restores.
  const segments = normalizeForMatching(input).split(PLACEHOLDER);
  const ordered = [...redactions].sort(
    (a, b) => b.value.length - a.value.length,
  );
  const patterns = ordered.map((r) => {
    const body = escapeRegExp(r.value).replace(/\\? /g, String.raw`\s+`);
    // A name is also hidden in its possessive: "Musters", "Erikas", "Müllers".
    const possessive = r.kind === "NAME" ? String.raw`(?:s|ens|[’']s)?` : "";
    return {
      r,
      pattern: new RegExp(
        String.raw`(?<![\p{L}\d])${body}${possessive}(?![\p{L}\d])`,
        "giu",
      ),
    };
  });
  return segments
    .map((segment, i) =>
      i % 2 === 1
        ? segment
        : patterns.reduce(
            (out, { r, pattern }) => out.replace(pattern, r.token),
            segment,
          ),
    )
    .join("");
}

/** Put the real values back. Unknown placeholders are left as they are. */
export function restore(text: string, redactions: Redaction[]): string {
  const byToken = new Map(redactions.map((r) => [r.token, r.value]));
  return text.replace(TOKEN, (token) => byToken.get(token) ?? token);
}

/** Apply `fn` to every string anywhere inside a JSON-like value. */
export function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]),
    ) as T;
  }
  return value;
}
