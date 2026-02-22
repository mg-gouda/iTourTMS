export const locales = ["en", "fr", "de", "tr", "it", "es", "ru", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  tr: "Türkçe",
  it: "Italiano",
  es: "Español",
  ru: "Русский",
  ar: "العربية",
};

export const rtlLocales: Locale[] = ["ar"];

export function isRTL(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}
