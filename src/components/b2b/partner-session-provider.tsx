"use client";

import { SessionProvider } from "next-auth/react";

import { PARTNER_AUTH_BASE_PATH } from "@/lib/b2b/limits";

/**
 * Points next-auth's client helpers at the partner realm.
 *
 * Without this, `signIn()` posts to /api/auth — the staff realm — because that
 * is the library's default and nothing about being rendered under /b2b tells
 * it otherwise. The sign-in form then silently authenticates against the wrong
 * realm, or fails with no useful message.
 */
export function PartnerSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath={PARTNER_AUTH_BASE_PATH}>{children}</SessionProvider>;
}
