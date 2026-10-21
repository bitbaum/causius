import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewQueue } from "@/components/helpers/ReviewQueue";
import { EntryLinks } from "@/components/site/EntryLinks";
import { shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";
import { auth, reviewer } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Review" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Staff only: the admissions to compare with the public register. */
export default async function ReviewPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Review");
  const [session, staff] = await Promise.all([auth(), reviewer()]);
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="headline text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-prose text-fg-secondary">{t("lead")}</p>
      <div className="mt-8">
        {staff ? <ReviewQueue /> : session ? <p>{t("notAllowed")}</p> : <EntryLinks from={ROUTES.review} />}
      </div>
    </main>
  );
}
