import { getTranslations } from "next-intl/server";

/**
 * The anonymisation, drawn: the same sentence in the person's browser, as the
 * model reads it, and back again. Literally what lib/redact.ts does to a
 * letter — the placeholders below are the ones it produces.
 */
export async function PrivacyFlow() {
  const t = await getTranslations("Home.privacy");
  const sentence = (name: React.ReactNode, street: React.ReactNode) => (
    <p className="text-sm leading-relaxed">
      {name}, {street}
    </p>
  );
  const steps = [
    { label: t("you"), body: sentence("Erika Muster", "Musterweg 1, 8000 Zürich") },
    { label: t("model"), body: sentence(<span className="token">[NAME-1]</span>, <span className="token">[ADDRESS-1]</span>), accent: true },
    { label: t("back"), body: sentence("Erika Muster", "Musterweg 1, 8000 Zürich") },
  ];
  return (
    <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {steps.map((s, i) => (
        <li key={i} className="contents">
          {i > 0 && (
            <span aria-hidden="true" className="self-center justify-self-center text-2xl text-fg-tertiary md:rotate-0 rotate-90">
              →
            </span>
          )}
          <div className={`rounded-surface border p-5 ${s.accent ? "border-accent bg-surface-base" : "border-border-subtle bg-surface-page"}`}>
            <p className={`kicker ${s.accent ? "text-accent" : ""}`}>{s.label}</p>
            <div className="mt-3">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
