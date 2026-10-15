"use client";

import { authClientPlugins } from "@bitbaum/accountkit/auth/client";
import { createAuthClient } from "better-auth/react";

/** The browser half of accounts. Talks only to this origin (/api/auth). */
export const authClient = createAuthClient({ plugins: authClientPlugins() });
