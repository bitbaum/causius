"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const NAV = [
  { href: ROUTES.cases, label: "My cases" },
  { href: ROUTES.helpers, label: "Helpers" },
  { href: ROUTES.settings, label: "Settings" },
] as const;

/**
 * The main nav. Fleet nav contract: the active link carries `aria-current`
 * (rule 1), every target is at least 44px (rule 3), the label is inside the
 * control (rule 4) and every href comes from the routes constant (rule 6).
 */
export function SiteNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // "New case" lives under /cases, so it wins over "My cases" when both match.
  const onNewCase = pathname === ROUTES.newCase;

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-1 text-sm">
      {NAV.map((n) => {
        const current = isCurrent(n.href) && !(onNewCase && n.href === ROUTES.cases);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current ? "page" : undefined}
            className="inline-flex min-h-11 min-w-11 items-center px-2.5 text-fg-secondary hover:text-fg-primary aria-[current=page]:text-fg-primary aria-[current=page]:underline aria-[current=page]:decoration-accent-fg aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
          >
            {n.label}
          </Link>
        );
      })}
      <Link
        href={ROUTES.newCase}
        aria-current={onNewCase ? "page" : undefined}
        className="ml-1.5 inline-flex min-h-11 items-center rounded-card bg-accent px-4 font-medium text-accent-contrast hover:opacity-85"
      >
        New case
      </Link>
    </nav>
  );
}
