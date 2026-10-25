"use client";

import { SignUpForm as SharedSignUpForm } from "@bitbaum/accountkit/auth/react";
import type { SignInMethods } from "@bitbaum/accountkit/auth";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@/lib/routes";
import { AUTH_CLASSES, useAuthLabels } from "./shared";

export function SignUpForm(props: {
  methods: SignInMethods;
  next: string;
  signUpPath: string;
}) {
  const labels = useAuthLabels();
  return (
    <SharedSignUpForm
      {...props}
      client={authClient}
      classes={AUTH_CLASSES}
      labels={labels}
      signInLink={
        <Link
          href={{ pathname: ROUTES.signIn, query: { next: props.next } }}
          className="underline underline-offset-4"
        >
          {labels.signIn}
        </Link>
      }
    />
  );
}
