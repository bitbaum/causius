import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The look lives in app/theme.css and is meant to be changed freely ("make it
 * red", "make it more gothic"). This is what makes that safe: whatever the
 * colours become, text must stay readable (WCAG AA, 4.5:1) in both modes.
 */
const css = readFileSync(new URL("../app/theme.css", import.meta.url), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block in theme.css`);
  return css.slice(start, css.indexOf("\n}", start));
}

type RGB = [number, number, number];

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function parse(value: string): RGB {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16) / 255) as RGB;
  const hsl = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(v);
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  throw new Error(`cannot read colour «${value}»`);
}

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Dark overrides light; a name the dark block does not set is light's. */
function tokens(mode: "light" | "dark"): (name: string) => RGB {
  const light = block(":root");
  const dark = mode === "dark" ? block(".dark") : "";
  return (name) => {
    for (const source of [dark, light]) {
      const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(source);
      if (m) return parse(m[1]!);
    }
    throw new Error(`--${name} is not set in theme.css`);
  };
}

const SURFACES = ["surface-page", "surface-base", "surface-raised", "surface-overlay"];
/** Text that carries meaning, with the floor each must clear. */
const TEXT: [string, number][] = [
  ["text-primary", 4.5],
  ["text-secondary", 4.5],
  ["text-tertiary", 4.5],
  ["public-accent", 4.5], // accent used as text: links, kickers, marks
  ["status-positive", 4.5],
  ["status-warning", 4.5],
  ["status-negative", 4.5],
];

describe.each(["light", "dark"] as const)("theme.css, %s mode", (mode) => {
  const t = tokens(mode);

  it.each(TEXT)("%s is readable on every surface (≥ %s:1)", (name, floor) => {
    for (const surface of SURFACES) {
      expect(contrast(t(name), t(surface)), `${name} on ${surface}`).toBeGreaterThanOrEqual(floor);
    }
  });

  it("puts a readable label on the action colour", () => {
    expect(contrast(t("on-accent"), t("public-accent"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the border that outlines a control visible against the page", () => {
    expect(contrast(t("border-interactive"), t("surface-page"))).toBeGreaterThanOrEqual(3);
  });
});

describe("theme.css", () => {
  it("sets every knob the shapes in globals.css read", () => {
    for (const knob of [
      "theme-headline-font",
      "theme-headline-case",
      "theme-headline-weight",
      "theme-action-case",
      "radius-control",
      "radius-surface",
    ]) {
      expect(css, knob).toContain(`--${knob}:`);
    }
  });
});
