"use client";

import { useLocale, useTranslations } from "next-intl";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import type { AuthClasses } from "@bitbaum/accountkit/auth/react";
import {
  button,
  buttonQuiet,
  card,
  input,
  label,
  notice,
  errorText,
} from "@/components/ui";

/** Shared behavior and translations, with Causius's shapes and profession labels. */
export const AUTH_CLASSES: Partial<AuthClasses> = {
  button,
  buttonQuiet,
  input,
  label,
  notice,
  error: errorText,
  stack: "grid gap-4",
  field: "grid gap-1.5",
  hint: "text-sm text-fg-secondary",
  section: card,
  sectionTitle: "mb-4 text-lg font-semibold",
  divider:
    "flex items-center gap-3 text-xs uppercase tracking-caps text-fg-tertiary before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle",
  link: "underline underline-offset-4",
  check: "flex min-h-11 items-center gap-3 text-sm text-fg-secondary",
};

export function useAuthLabels() {
  const labels = authLabelsFor(useLocale());
  const t = useTranslations("Account.roles");
  return {
    ...labels,
    account: {
      ...labels.account,
      roles: {
        customer: t("customer"),
        helper: t("helper"),
        professional: t("professional"),
        staff: t("staff"),
        admin: t("admin"),
      },
    },
  };
}
