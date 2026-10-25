"use client";

import type { ComponentProps } from "react";
import { AccountPanel as SharedAccountPanel } from "@bitbaum/accountkit/auth/react";
import { authClient } from "@/lib/auth-client";
import { AUTH_CLASSES, useAuthLabels } from "./shared";

type Props = Omit<
  ComponentProps<typeof SharedAccountPanel>,
  "client" | "labels" | "classes"
>;

export function AccountPanel(props: Props) {
  return (
    <SharedAccountPanel
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      labels={useAuthLabels()}
    />
  );
}
