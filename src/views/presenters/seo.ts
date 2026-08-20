import type { Metadata } from "next";
import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { absoluteUrl } from "@/src/views/presenters/siteUrl";

const seoByScale: Record<
  ScheduleType,
  { title: string; description: string; path: string }
> = {
  "6x1": {
    title: "Calculadora de Escala 6x1 | Minha Escala",
    description:
      "Calcule folgas, dias de trabalho e calendário mensal da escala 6x1 informando uma folga conhecida.",
    path: "/escala-6x1",
  },
  "12x36": {
    title: "Calculadora de Escala 12x36 | Minha Escala",
    description:
      "Veja hoje, amanhã, próximas folgas e calendário mensal da escala 12x36 a partir do início do plantão.",
    path: "/escala-12x36",
  },
  "6x2": {
    title: "Calculadora de Escala 6x2 | Minha Escala",
    description:
      "Consulte a escala 6x2 com seis dias de trabalho e duas folgas usando o primeiro dia trabalhado como referência.",
    path: "/escala-6x2",
  },
  "3x3": {
    title: "Calculadora de Escala 3x3 | Minha Escala",
    description:
      "Consulte a escala 3x3 com três dias de trabalho e três folgas usando o primeiro dia trabalhado como referência.",
    path: "/escala-3x3",
  },
};

export function scaleMetadata(type: ScheduleType): Metadata {
  const seo = seoByScale[type];
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.path,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.path,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
  };
}

export function structuredCalculatorData(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
  };
}
