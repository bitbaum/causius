import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyForm } from "@/components/helpers/VerifyForm";
import { shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Verify" });
  return { title: t("metaTitle") };
}

/** Anyone can check what Causius signed. Nothing about a lawyer is needed beyond what they choose to show. */
export default async function VerifyPage({ params, searchParams }: Props) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Verify");
  const { token } = await searchParams;
  return (
    <main className={`${shell} max-w-3xl py-10 sm:py-14`}>
      <h1 className="headline text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-prose text-fg-secondary">{t("lead")}</p>
      <div className="mt-8">
        <VerifyForm initialToken={typeof token === "string" ? token.slice(0, 8000) : ""} />
      </div>
    </main>
  );
}
