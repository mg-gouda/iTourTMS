import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { auth } from "@/lib/auth";

import { defaultLocale } from "./config";

/** Set by the profile's language picker so a change applies without signing in again. */
export const LOCALE_COOKIE = "itms-locale";
/** Languages that have a messages file. */
const AVAILABLE = ["en", "ar"];

type Messages = Record<string, unknown>;
// Untranslated keys fall back to English instead of showing their key.
const merge = (base: Messages, over: Messages): Messages => {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && typeof base[k] === "object" ? merge(base[k] as Messages, v as Messages) : v;
  }
  return out;
};

export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value ?? (await auth())?.user?.locale;
  const locale = chosen && AVAILABLE.includes(chosen) ? chosen : defaultLocale;

  const en = (await import("../../../messages/en.json")).default as Messages;
  const messages = locale === "en" ? en : merge(en, (await import(`../../../messages/${locale}.json`)).default);
  return { locale, messages };
});
