import { getTranslations } from "next-intl/server";
import { CAPABILITIES, type CapabilityKey } from "@/lib/capabilities";

const DOT = {
  available: "bg-status-positive",
  inDevelopment: "bg-accent",
  planned: "border border-border-strong",
} as const;

/**
 * Which capabilities are real today. The status comes from lib/capabilities.ts,
 * never from the page. Colour is never the only carrier: the status is written.
 */
export async function CapabilityList({ items }: { items: readonly CapabilityKey[] }) {
  const t = await getTranslations("Capabilities");
  return (
    <ul className="divide-y divide-border-subtle border-y border-border-subtle">
      {items.map((key) => {
        const status = CAPABILITIES[key];
        return (
          <li key={key} className="grid gap-2 py-5 sm:grid-cols-[1fr_11rem] sm:gap-8">
            <div>
              <div className="font-semibold text-fg-primary">{t(`${key}.name`)}</div>
              <p className="mt-1 max-w-copy text-sm text-fg-secondary">{t(`${key}.body`)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-caps text-fg-secondary sm:justify-end">
              <span className={`h-2 w-2 shrink-0 rounded-pill ${DOT[status]}`} aria-hidden="true" />
              {t(`status.${status}`)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
