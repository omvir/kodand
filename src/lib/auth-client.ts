"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, multiSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [
    adminClient(),
    multiSessionClient(),
  ],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
