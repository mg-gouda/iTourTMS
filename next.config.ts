import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty", "pdf-parse"],
};

export default withNextIntl(nextConfig);
