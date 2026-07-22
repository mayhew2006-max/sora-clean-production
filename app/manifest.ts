import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Grace - Personal Command Center",
    short_name: "Grace",
    description:
      "Grace helps you analyze photos, check Marketplace deals, search the web, create plans, save reports, and download PDFs.",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    background_color: "#fff7f1",
    theme_color: "#f3a683",
    orientation: "portrait",
    categories: ["productivity", "utilities", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
