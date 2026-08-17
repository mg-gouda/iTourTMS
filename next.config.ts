import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/**
 * The App Router ships inline bootstrap/flight scripts and Tailwind emits
 * inline styles, so 'unsafe-inline' stays until there is a nonce pipeline.
 * The value is still worth setting: it pins script and connect origins to us
 * plus Google Maps, which is what turns a stored-XSS payload from
 * "exfiltrate the session" into "blocked".
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com",
  "worker-src 'self' blob:",
  // CMS content may embed video players; everything else is locked down.
  "frame-src https:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  // next dev appends its own block to CLAUDE.md otherwise — this repo's
  // agent instructions are hand-maintained.
  agentRules: false,
  // Don't advertise the framework and version to scanners.
  poweredByHeader: false,
  serverExternalPackages: ["pino", "pino-pretty", "pdf-parse"],
  // Next traces only the CJS half of @swc/helpers, but the standalone server
  // imports its ESM entry points — without this the container starts and dies
  // with MODULE_NOT_FOUND on @swc/helpers/esm/*.
  outputFileTracingIncludes: {
    "*": ["./node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
  experimental: {
    optimizePackageImports: ["recharts", "@tanstack/react-table", "lucide-react", "date-fns"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
