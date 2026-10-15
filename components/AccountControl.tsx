"use client";

import { AccountMenu } from "@bitbaum/accountkit";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * The fleet's one account menu (@bitbaum/accountkit), with Causius's places.
 * Sign-in is a link to OrangeCat's one screen; sign-out a server action passed
 * in, so this file holds no auth logic of its own.
 */
export function AccountControl({
  user,
  signInHref,
  signOutAction,
  fleet,
}: {
  user: { name?: string | null; image?: string | null } | null;
  /** /<locale>/sign-in?from=… — a plain link, see lib/auth/entry.ts. */
  signInHref: string;
  signOutAction: () => Promise<void>;
  /** The other fleet products this one account opens, from the fleet map. */
  fleet: { slug: string; name: string; url: string }[];
}) {
  const t = useTranslations("Account");
  if (!user) {
    return (
      <a href={signInHref} className="btn-secondary">
        {t("signIn")}
      </a>
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
            { id: "account", label: t("account"), href: ROUTES.account },
            { id: "settings", label: t("settings"), href: ROUTES.settings },
          ],
        },
        // The same account opens the rest of the fleet; say so where the
        // person looks for their account.
        ...(fleet.length
          ? [{ id: "fleet", items: fleet.map((p) => ({ id: p.slug, label: t("openIn", { name: p.name }), href: p.url })) }]
          : []),
      ]}
      onSignOut={() => signOutAction()}
      renderLink={({ href, children, ...rest }) =>
        href.startsWith("https://") ? (
          <a href={href} {...rest}>
            {children}
          </a>
        ) : (
          <Link href={href} {...rest}>
            {children}
          </Link>
        )
      }
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
