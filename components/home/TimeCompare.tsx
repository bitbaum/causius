import { getTranslations } from "next-intl/server";

const WITHOUT = ["w1", "w2", "w3", "w4"] as const;
const WITH = ["c1", "c2", "c3", "c4"] as const;
// The days fade as they pass.
const FADE = ["opacity-100", "opacity-85", "opacity-70", "opacity-55"] as const;

/**
 * Two calendars side by side: the days a letter usually costs, and the minutes
 * it takes here. The left column fades as it goes, because that is how it
 * feels; the right ends with the person's decision, because that is the point.
 */
export async function TimeCompare() {
  const t = await getTranslations("Home.time");
  const column = (title: string, keys: readonly string[], tone: "dim" | "bright") => (
    <div className={`rounded-surface border p-5 sm:p-6 ${tone === "bright" ? "border-accent bg-surface-base" : "border-border-subtle"}`}>
      <p className={`kicker ${tone === "bright" ? "text-accent" : ""}`}>{title}</p>
      <ol className="mt-4 grid gap-2">
        {keys.map((k, i) => (
          <li
            key={k}
            className={`grid grid-cols-[5.5rem_1fr] items-center gap-3 rounded-control px-3 py-2.5 text-sm ${
              tone === "bright" ? (i === keys.length - 1 ? "bg-accent/10 font-medium" : "bg-surface-raised") : `bg-surface-raised/60 ${FADE[i]}`
            }`}
          >
            <span className="font-mono text-xs text-fg-tertiary">{t(`${k}.when`)}</span>
            <span>{t(`${k}.what`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {column(t("without"), WITHOUT, "dim")}
      {column(t("with"), WITH, "bright")}
    </div>
  );
}
