"use client";

import { SignInForm as SharedSignInForm } from "@bitbaum/accountkit/auth/react";
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@/lib/routes";
import { AUTH_CLASSES, useAuthLabels } from "./shared";

export function SignInForm(props: {
  methods: SignInMethods;
  next: string;
  signInPath: string;
  initialError: boolean;
}) {
  const labels = useAuthLabels();
  return (
    <SharedSignInForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      labels={labels}
      signUpLink={
        <Link
          href={{ pathname: ROUTES.signUp, query: { next: props.next } }}
          className="underline underline-offset-4"
        >
          {labels.createAccount}
        </Link>
      }
    />
  );
}
