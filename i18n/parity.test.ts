import { describe, expect, it } from "vitest";
import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

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

/** `{name}` and `{count, plural, …}` arguments a message takes. */
function args(message: string): string[] {
  return [...message.matchAll(/\{\s*(\w+)\s*[,}]/g)]
    .map((m) => m[1])
    .filter((name) => !["one", "other", "zero", "two", "few", "many"].includes(name))
    .toSorted();
}

const source = leaves(en);
/** English is empty here on purpose: the note only exists for a translation. */
const SOURCE_ONLY_EMPTY = new Set(["Records.englishOnly"]);

describe.each([
  ["de", leaves(de)],
  ["fr", leaves(fr)],
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
