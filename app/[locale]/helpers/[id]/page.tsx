import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AskForHelp } from "@/components/helpers/AskForHelp";
import { hostOf, languageList, placeList } from "@/components/helpers/labels";
import { EntryLinks } from "@/components/site/EntryLinks";
import { card, eyebrow, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/case";
import { dbConfigured, getDb } from "@/lib/db";
import { publicHelper } from "@/lib/helpers/store";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { PROFESSIONS } from "@/lib/professions";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ matter?: string }>;
};

async function load(id: string) {
  return dbConfigured() ? publicHelper(getDb(), id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const helper = await load(id);
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Helper" });
  return helper ? { title: t("metaTitle", { name: helper.name }), description: helper.headline || undefined } : {};
}

/**
 * One helper, in public. For a lawyer, the admission Causius checked, with the
 * signed attestation anyone can verify — and never the name behind it.
 */
export default async function HelperPage({ params, searchParams }: Props) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const helper = await load(id);
  if (!helper) notFound();
  const t = await getTranslations("Helper");
  const p = await getTranslations("Professions");
  const session = await auth();
  const { matter } = await searchParams;
  const facts = [
    { label: t("places"), value: placeList(helper.jurisdictions, locale) },
    { label: t("languages"), value: languageList(helper.languages, locale) },
    { label: t("areas"), value: helper.areas.map((a) => p(`areas.${a}`)).join(" · ") },
  ].filter((f) => f.value);

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <Link href={ROUTES.helpers} className={`${link} inline-flex min-h-11 items-center text-sm`}>
        &larr; {t("back")}
      </Link>
      <p className={`${eyebrow} mt-6`}>{p(`kinds.${helper.kind}.name`)}</p>
      <h1 className="mt-3 headline text-4xl sm:text-5xl">{helper.name}</h1>
      {helper.headline && <p className="mt-4 max-w-prose text-lg text-fg-secondary">{helper.headline}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="grid content-start gap-8">
          <dl className="grid gap-4 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="kicker">{f.label}</dt>
                <dd className="mt-1">{f.value}</dd>
              </div>
            ))}
          </dl>
          {helper.bio && <p className="max-w-prose whitespace-pre-line leading-relaxed">{helper.bio}</p>}
          <p className="text-sm text-fg-secondary">
            {PROFESSIONS[helper.kind].mayAdvise ? p(`kinds.${helper.kind}.does`) : t("notLawyer")}
          </p>
          {helper.serviceUrl && (
            <p>
              <a href={helper.serviceUrl} rel="noopener noreferrer" className={link}>
                {t("paid", { host: hostOf(helper.serviceUrl) })}
              </a>
            </p>
          )}

          {helper.attestations.map((a) => (
            <section key={a.credentialId} className={`${card} grid gap-3 border-status-positive`}>
              <h2 className="font-semibold">{t("checkedTitle")}</h2>
              <p className="text-sm text-fg-secondary">
                {t("checkedBody", { place: jurisdictionLabel(a.jurisdiction, locale), date: formatDate(a.verifiedAt.slice(0, 10), locale) })}
              </p>
              <p className="text-xs text-fg-tertiary">{t("valid", { date: formatDate(a.expiresAt.slice(0, 10), locale) })}</p>
              <code className="block max-h-24 overflow-auto break-all rounded-control bg-surface-raised p-3 font-mono text-xs">
                {a.token}
              </code>
              <Link href={{ pathname: ROUTES.verify, query: { token: a.token } }} className={`${link} inline-flex min-h-11 items-center text-sm`}>
                {t("checkIt")}
              </Link>
            </section>
          ))}
        </div>

        <aside className={`${card} grid content-start gap-4`}>
          <h2 className="text-xl font-semibold tracking-tight">{t("ask.title")}</h2>
          {session?.actorId ? (
            <AskForHelp helperId={helper.id} preselect={matter} />
          ) : (
            <>
              <p className="text-sm text-fg-secondary">{t("ask.signIn")}</p>
              <EntryLinks from={ROUTES.helperById(helper.id)} />
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
