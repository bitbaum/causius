import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MatterWorkspace } from "@/components/matters/MatterWorkspace";
import { card, shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { EntryLinks } from "@/components/site/EntryLinks";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Matter" });
  // The matter's own title is never put in <title>: it would sit in browser
  // history and tab lists on shared computers.
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function MatterPage({ params }: Params) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const session = await auth();
  const t = await getTranslations("Matters");

  return (
    <main className={`${shell} py-8 sm:py-12`}>
      {session?.actorId ? (
        <MatterWorkspace id={id} me={session.actorId} />
      ) : (
        <div className={`${card} grid gap-4 sm:p-8`}>
          <h1 className="text-2xl font-semibold tracking-tight">{t("signInTitle")}</h1>
          <EntryLinks from={ROUTES.matterById(id)} />
        </div>
      )}
    </main>
  );
}
