"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";

/** The page's current mode, read from the class the boot script already set. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Light or dark, the reader's choice. Until they choose, the device's
 * preference rules (see THEME_BOOT in lib/theme.ts); after, theirs does. A
 * plain button with a state, so it works for a screen reader and a keyboard.
 */
export function ThemeToggle() {
  const t = useTranslations("Nav");
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={t("dark")}
      title={t("dark")}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
          window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
        } catch {
          // Storage blocked: the choice holds for this visit only.
        }
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg-secondary transition-colors hover:text-fg-primary"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
