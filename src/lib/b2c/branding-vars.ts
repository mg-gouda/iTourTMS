import type { PublicBranding } from "./get-branding";

/** Black or white, whichever reads on the given background. */
function contrastForeground(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#1d1d1f" : "#ffffff";
}

/** "system" means the device's own UI face: SF Pro / SF Arabic on Apple, the platform face elsewhere. */
const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Arabic", sans-serif';
const font = (name: string) => (name === "system" ? SYSTEM_STACK : `"${name}", ${SYSTEM_STACK}`);

/** The public site's theme as CSS custom properties (rendered on the server and mirrored on <html>). */
export function brandingVars(b: PublicBranding): Record<string, string> {
  return {
    "--pub-primary": b.primaryColor,
    "--pub-primary-foreground": contrastForeground(b.primaryColor),
    "--pub-secondary": b.secondaryColor,
    "--pub-secondary-foreground": contrastForeground(b.secondaryColor),
    "--pub-accent": b.accentColor,
    "--pub-accent-foreground": contrastForeground(b.accentColor),
    "--pub-background": b.backgroundColor,
    "--pub-foreground": b.foregroundColor,
    "--pub-card": b.cardColor,
    "--pub-card-foreground": contrastForeground(b.cardColor),
    "--pub-muted": b.mutedColor,
    "--pub-heading-font": font(b.headingFont),
    "--pub-body-font": font(b.bodyFont),
  };
}
