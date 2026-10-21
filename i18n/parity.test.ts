import { describe, expect, it } from "vitest";
import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import it_ from "../messages/it.json";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

/**
 * The arguments a message takes: `{name}`, and the selector of every
 * `{count, plural, …}` / `{layer, select, …}`, at any depth. A branch body
 * (`one {# page}`, `economic {Wirtschaft}`) is text, which is translated and
 * may itself hold arguments, so it is read as text again — never as an
 * argument name. A small ICU walk rather than a regex: the regex this replaced
 * read a translated select branch as a missing argument.
 */
function args(message: string): string[] {
  const found = new Set<string>();
  let i = 0;
  function text(): void {
    while (i < message.length && message[i] !== "}") {
      // ICU quoting: an apostrophe quotes only before a syntax character, so
      // the French "l'ordre" is plain text.
      if (message[i] === "'" && /[{}#']/.test(message[i + 1] ?? "")) {
        const end = message.indexOf("'", i + 1);
        i = end < 0 ? message.length : end + 1;
      } else if (message[i] === "{") {
        i++;
        argument();
      } else i++;
    }
  }
  function argument(): void {
    const head = /^\s*(\w+)\s*(?:,\s*(\w+)\s*)?/.exec(message.slice(i))!;
    found.add(head[1]);
    i += head[0].length;
    if (message[i] === ",") {
      i++;
      // Branches: `key {body}` pairs (with an optional `offset:n`) until `}`.
      while (i < message.length && message[i] !== "}") {
        if (message[i] === "{") {
          i++;
          text();
        }
        i++;
      }
    }
    i++; // the closing brace
  }
  text();
  return [...found].toSorted();
}

const source = leaves(en);
/** English is empty here on purpose: the note only exists for a translation. */
const SOURCE_ONLY_EMPTY = new Set(["Records.englishOnly"]);

describe.each([
  ["de", leaves(de)],
  ["fr", leaves(fr)],
  ["it", leaves(it_)],
])("messages/%s.json", (_locale, translated) => {
  it("has exactly the keys English has", () => {
    expect([...translated.keys()].toSorted()).toEqual([...source.keys()].toSorted());
  });

  it("leaves no message empty", () => {
    const empty = [...translated].filter(([, value]) => !value.trim()).map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("takes the same arguments as English in every message", () => {
    const mismatched = [...source]
      .filter(([key, value]) => String(args(value)) !== String(args(translated.get(key) ?? "")))
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });
});

describe("messages/en.json", () => {
  it("leaves no message empty", () => {
    const empty = [...source]
      .filter(([key, value]) => !value.trim() && !SOURCE_ONLY_EMPTY.has(key))
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});

describe("Swiss German", () => {
  it("is spelled with ss, never ß", () => {
    expect([...leaves(de)].filter(([, value]) => value.includes("ß")).map(([key]) => key)).toEqual(
      [],
    );
  });
});
