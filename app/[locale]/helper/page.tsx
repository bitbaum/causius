import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelperDesk } from "@/components/helpers/desk/HelperDesk";
import { EntryLinks } from "@/components/site/EntryLinks";
import { card, eyebrow, shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "HelperDesk" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Where someone becomes a helper and works as one. The same account can also have matters of its own. */
export default async function HelperDeskPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("HelperDesk");
  const session = await auth();
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <p className={eyebrow}>{t("metaTitle")}</p>
      <h1 className="mt-4 headline text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-fg-secondary">{t("lead")}</p>
      <div className="mt-10">
        {session?.actorId ? (
          <HelperDesk />
        ) : (
          <div className={`${card} grid gap-4 sm:p-8`}>
            <h2 className="text-2xl font-semibold tracking-tight">{t("signIn")}</h2>
            <EntryLinks from={ROUTES.helperDesk} />
          </div>
        )}
      </div>
    </main>
  );
}
