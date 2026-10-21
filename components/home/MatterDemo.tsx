import { getTranslations } from "next-intl/server";

/**
 * The product, shown working on one invented letter: the name becomes a
 * placeholder before any model reads it, the deadline appears with the words
 * it was read from, a reply is drafted, and the person is asked. The motion is
 * CSS (globals.css, `.demo-*`); with reduced motion it is one still picture.
 */
export async function MatterDemo() {
  const t = await getTranslations("Home.demo");
  return (
    <figure
      aria-label={t("label")}
      className="relative rounded-surface border border-border bg-surface-base p-5 shadow-[0_30px_60px_-30px_hsl(var(--text-primary)/0.25)] sm:p-6"
    >
      <figcaption className="kicker flex items-center justify-between">
        <span>{t("label")}</span>
        <span className="font-mono normal-case tracking-normal text-fg-tertiary">CH-ZH</span>
      </figcaption>

      <div className="mt-5 rounded-control border border-border-subtle bg-surface-page p-4 text-sm leading-relaxed">
        <p className="kicker">{t("letter")}</p>
        <p className="mt-3">
          {t.rich("line1", {
            name: (real) => (
              <span className="relative inline-grid justify-items-start">
                <span className="demo-real col-start-1 row-start-1">{real}</span>
                <span className="demo-token token col-start-1 row-start-1 self-center" aria-hidden="true">
                  [NAME-1]
                </span>
              </span>
            ),
          })}
        </p>
        <p className="mt-2 text-fg-secondary">{t("line2")}</p>
      </div>

      <ol className="mt-4 grid gap-2 text-sm">
        <li className="demo-step flex items-center justify-between gap-3" data-step="1">
          <span className="text-fg-secondary">{t("hidden")}</span>
          <span className="token">[NAME-1]</span>
        </li>
        <li className="demo-step rounded-control border border-status-warning/40 bg-status-warning-subtle px-3 py-2" data-step="2">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-status-warning">{t("deadline")}</span>
            <span className="font-semibold">{t("deadlineValue")}</span>
          </span>
          <span className="mt-0.5 block text-xs italic text-fg-secondary">{t("source")}</span>
        </li>
        <li className="demo-step flex items-center gap-2 py-1" data-step="3">
          <span aria-hidden="true" className="text-status-positive">✓</span>
          {t("draft")}
        </li>
        <li className="demo-step flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3" data-step="4">
          <span className="font-medium">{t("approve")}</span>
          <span className="flex gap-2" aria-hidden="true">
            <span className="rounded-control bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent">{t("yes")}</span>
            <span className="rounded-control border border-border px-3 py-1.5 text-xs font-semibold">{t("no")}</span>
          </span>
        </li>
      </ol>
    </figure>
  );
}
