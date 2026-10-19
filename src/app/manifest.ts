import type { MetadataRoute } from "next";

/** Installable staff app: opens on the dashboard, standalone window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iTourTMS",
    short_name: "iTour",
    description: "Travel management: reservations, transfers, excursions, finance.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#17141A",
    theme_color: "#660066",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
