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

/** A capitalised word in any of the languages letters arrive in. */
const WORD = String.raw`\p{Lu}[\p{L}'’-]+`;
/** Space within one line. A name or an address never continues on the next. */
const SP = String.raw`[ \t]+`;
/** Up to three name parts: "Erika", "Muster Erika", "Jean-Luc de la Tour". */
const NAME = String.raw`${WORD}(?:${SP}(?:(?:von|van|de|del|della|di|du|da|la|le)${SP})?${WORD}){0,2}`;

interface Rule {
  kind: RedactionKind;
  /** Must have a capturing group 1: the part that is hidden. */
  pattern: RegExp;
}

/**
 * Order matters only for overlapping finds: earlier rules win. Specific
 * numbers come before the loose name patterns so that "IBAN CH93 …" is an
 * IBAN, not a name.
 */
const RULES: Rule[] = [
  { kind: "EMAIL", pattern: /([\p{L}\d._%+-]+@[\p{L}\d.-]+\.\p{L}{2,})/gu },
  // Swiss social security number, with or without dots.
  { kind: "AHV", pattern: /\b(756[.\s]?\d{4}[.\s]?\d{4}[.\s]?\d{2})\b/g },
  // IBAN: country, check digits, then groups of four.
  { kind: "IBAN", pattern: /\b([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?)\b/g },
  // Phone numbers: international or Swiss national format.
  {
    kind: "PHONE",
    pattern: /(?<![\w.])((?:\+|00)\d{2}[\s./-]?(?:\(0\))?\d{1,3}(?:[\s./-]?\d{2,4}){2,4}|0\d{2}[\s./-]\d{3}[\s./-]\d{2}[\s./-]\d{2})(?![\w.])/g,
  },
  // A date of birth, only where the letter labels it as one.
  {
    kind: "BIRTHDATE",
    pattern:
      /(?:geb\.|geboren(?:\s+am)?|Geburtsdatum:?|n[ée]e?\s+le|date\s+de\s+naissance:?|date\s+of\s+birth:?|born(?:\s+on)?|DOB:?)\s*(\d{1,2}[./-]\s?\d{1,2}[./-]\s?\d{2,4}|\d{1,2}\.?\s+\p{L}+\s+\d{4})/giu,
  },
  // Reference and file numbers, where the letter labels them. The label stays:
  // the model should know a reference exists, not what it is.
  {
    kind: "REF",
    pattern:
      /(?:ZEMIS(?:[- ]?Nr\.?)?|Ref(?:erenz)?(?:[- ]?Nr)?\.?|Kant\.?\s*Ref\.?\s*Nr\.?|Dossier(?:[- ]?Nr\.?)?|Aktenzeichen|Gesch(?:äfts|afts)[- ]?Nr\.?|Kunden[- ]?Nr\.?|Versicherten[- ]?Nr\.?|N°|No\.|Nr\.|Référence|Case\s+(?:no\.|number))\s*:?\s*((?:[A-Z]{1,4}[\s-]?)?\d[\d.\s/-]{3,}\d)/giu,
  },
  // "c/o Hans Beispiel" — the person a letter is sent through.
  { kind: "NAME", pattern: new RegExp(String.raw`c\/o${SP}(${NAME})`, "gu") },
  // The addressee in a salutation or address block.
  {
    kind: "NAME",
    pattern: new RegExp(
      String.raw`(?:Herrn?|Frau|Mr\.?|Mrs\.?|Ms\.?|Miss|Monsieur|Madame|Mademoiselle|M\.|Mme|Mlle|Signor[ae]?|Sig\.(?:ra)?)(?:${SP}|\n[ \t]*)(${NAME})`,
      "gu",
    ),
  },
  // A street and house number, in German, French or Italian form.
  {
    kind: "ADDRESS",
    pattern: new RegExp(
      String.raw`(${WORD}(?:strasse|straße|str\.|gasse|weg|platz|allee|rain|ring|hof|halde|matt|graben)${SP}\d+[a-zA-Z]?\b|(?:Rue|Avenue|Av\.|Chemin|Ch\.|Route|Rte|Place|Boulevard|Bd|Via|Viale|Piazza)${SP}(?:(?:de|du|des|de la|de l'|della|del)${SP})?${WORD}(?:${SP}${WORD})?${SP}\d+[a-zA-Z]?\b)`,
      "gu",
    ),
  },
  // A postcode and town at the start of a line, as in an address block. Only
  // at the start of a line: "2026 Zur Behandlung" in running text is a year.
  { kind: "POSTCODE", pattern: new RegExp(String.raw`^[ \t]*((?:CH-)?\d{4}${SP}${WORD}(?:${SP}${WORD})?)[ \t]*$`, "gmu") },
];

const TOKEN = /\[(NAME|ADDRESS|POSTCODE|EMAIL|PHONE|IBAN|AHV|REF|BIRTHDATE)-(\d+)\]/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every distinct value worth hiding, in the order found. */
export function findPersonalData(text: string, ownWords: string[] = []): Omit<Redaction, "token">[] {
  const found = new Map<string, RedactionKind>();
  const add = (value: string, kind: RedactionKind) => {
    const v = value.trim().replace(/\s+/g, " ");
    if (v.length >= 2 && !found.has(v)) found.set(v, kind);
  };

  for (const word of ownWords) add(word, "NAME");
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      if (match[1]) add(match[1], rule.kind);
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
export function applyRedactions(text: string, redactions: Redaction[]): string {
  let out = text;
  for (const r of [...redactions].sort((a, b) => b.value.length - a.value.length)) {
    const pattern = new RegExp(
      String.raw`(?<![\p{L}\d])${escapeRegExp(r.value).replace(/\\? /g, String.raw`\s+`)}(?![\p{L}\d])`,
      "giu",
    );
    out = out.replace(pattern, r.token);
  }
  return out;
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
