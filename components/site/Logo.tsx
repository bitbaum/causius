/**
 * The section sign and the word. The § is how a statute numbers its rules, and
 * Causius's work is getting from a § to what a person should do. Set in the
 * shared display face, in the one accent the fleet shares; the word is set in
 * the sans like every fleet wordmark (Solon's, Loki's), not in the serif.
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`font-display leading-none text-accent ${size === "sm" ? "text-2xl" : "text-3xl"}`}
      >
        §
      </span>
      <span className={`font-bold uppercase tracking-caps text-fg-primary ${size === "sm" ? "text-sm" : "text-base"}`}>
        Causius
      </span>
    </span>
  );
}
