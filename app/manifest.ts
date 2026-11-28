import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Escala — Calculadora de Escalas de Trabalho",
    short_name: "Minha Escala",
    description:
      "Calcule escalas 6x1, 12x36, 6x2 e 3x3 e veja seu calendário de trabalho.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f5f9f8",
    theme_color: "#146b5f",
    lang: "pt-BR",
    dir: "ltr",
    prefer_related_applications: false,
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
