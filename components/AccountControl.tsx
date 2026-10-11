"use client";

import { AccountMenu } from "@bitbaum/accountkit";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * The fleet's one account menu (@bitbaum/accountkit), with Causius's places.
 * Sign-in and sign-out are server actions passed in, so this file holds no
 * auth logic of its own.
 */
export function AccountControl({
  user,
  signInAction,
  signOutAction,
}: {
  user: { name?: string | null; image?: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("Account");
  if (!user) {
    return (
      <form action={signInAction}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-card border border-border-subtle px-3.5 text-sm font-medium hover:bg-surface-raised"
        >
          {t("signIn")}
        </button>
      </form>
    );
  }
  return (
    <AccountMenu
      user={{ name: user.name ?? undefined, image: user.image ?? undefined }}
      groups={[
        {
          id: "places",
          items: [
            { id: "matters", label: t("matters"), href: ROUTES.matters },
            { id: "settings", label: t("settings"), href: ROUTES.settings },
          ],
        },
      ]}
      onSignOut={() => signOutAction()}
      renderLink={({ href, children, ...rest }) => (
        <Link href={href} {...rest}>
          {children}
        </Link>
      )}
      labels={{
        trigger: t("trigger"),
        menu: t("menu"),
        signOut: t("signOut"),
        signingOut: t("signingOut"),
        signOutFailed: t("signOutFailed"),
      }}
    />
  );
}
