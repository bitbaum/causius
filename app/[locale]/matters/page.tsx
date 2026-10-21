import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MattersHome } from "@/components/matters/MattersHome";
import { workflowById } from "@/lib/workflows";
import { card, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { EntryLinks } from "@/components/site/EntryLinks";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };
type Props = Params & { searchParams: Promise<{ workflow?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Matters" });
  return { title: t("title") };
}

export default async function MattersPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Matters");
  const session = await auth();
  const { workflow } = await searchParams;
  // A problem chosen before signing in is still chosen after it.
  const from = workflowById(workflow) ? `${ROUTES.matters}?workflow=${workflow}` : ROUTES.matters;

  return (
    <main className={`${shell} py-section-tight`}>
      <div className="kicker">{t("kicker")}</div>
      <h1 className="headline mt-5 text-4xl sm:text-5xl lg:text-6xl">{t("title")}</h1>
      <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("lead")}</p>
      <div className="mt-10">
        {session?.actorId ? (
          <MattersHome workflow={workflow} />
        ) : (
          <div className={`${card} grid gap-4 sm:p-8`}>
            <h2 className="text-2xl font-semibold tracking-tight">{t("signInTitle")}</h2>
            <p className="max-w-prose text-sm leading-relaxed text-fg-secondary">{t("signInLead")}</p>
            <EntryLinks from={from} />
            <p className="text-sm">
              <Link href={ROUTES.newCase} className={`${link} inline-flex min-h-11 items-center`}>
                {t("quickCheckSignedOut")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
