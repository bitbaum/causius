import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnModelSettings } from "@/components/OwnModelSettings";
import { shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Settings" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SettingsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(toLocale(locale));
  const t = await getTranslations("Settings");

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="font-heading text-4xl font-semibold tracking-display">{t("title")}</h1>

      <section id="ai" aria-labelledby="ai-title" className="mt-10 scroll-mt-8">
        <h2 id="ai-title" className="font-heading text-2xl font-semibold">
          {t("ownTitle")}
        </h2>
        <div className="mt-3 grid max-w-prose gap-3 leading-relaxed text-fg-secondary">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
        </div>
        <div className="mt-8">
          <OwnModelSettings />
        </div>
      </section>
    </main>
  );
}
