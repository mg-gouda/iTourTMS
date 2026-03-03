/**
 * Google Fonts mapping for the public site.
 * Maps font names to their Google Fonts import URLs.
 */

const GOOGLE_FONTS_MAP: Record<string, { weights: string; display: string }> = {
  Inter: { weights: "400;500;600;700", display: "swap" },
  Poppins: { weights: "400;500;600;700;800", display: "swap" },
  Roboto: { weights: "400;500;700", display: "swap" },
  "Open Sans": { weights: "400;600;700", display: "swap" },
  Lato: { weights: "400;700;900", display: "swap" },
  Montserrat: { weights: "400;500;600;700;800", display: "swap" },
  Raleway: { weights: "400;500;600;700", display: "swap" },
  Playfair: { weights: "400;500;600;700", display: "swap" },
  "Playfair Display": { weights: "400;500;600;700", display: "swap" },
  "DM Sans": { weights: "400;500;600;700", display: "swap" },
  "DM Serif Display": { weights: "400", display: "swap" },
  Nunito: { weights: "400;600;700;800", display: "swap" },
  "Source Sans 3": { weights: "400;600;700", display: "swap" },
  Manrope: { weights: "400;500;600;700;800", display: "swap" },
  "Plus Jakarta Sans": { weights: "400;500;600;700;800", display: "swap" },
};

/**
 * Build Google Fonts URL for given heading + body font.
 * Deduplicates if both are the same font.
 */
export function buildGoogleFontsUrl(headingFont: string, bodyFont: string): string | null {
  const families: string[] = [];

  const heading = GOOGLE_FONTS_MAP[headingFont];
  if (heading) {
    families.push(`family=${encodeURIComponent(headingFont)}:wght@${heading.weights}`);
  }

  if (bodyFont !== headingFont) {
    const body = GOOGLE_FONTS_MAP[bodyFont];
    if (body) {
      families.push(`family=${encodeURIComponent(bodyFont)}:wght@${body.weights}`);
    }
  }

  if (families.length === 0) return null;

  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** All available fonts for the branding editor dropdown */
export const AVAILABLE_FONTS = Object.keys(GOOGLE_FONTS_MAP);
