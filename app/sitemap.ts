import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/src/views/presenters/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/escala-6x1",
    "/escala-12x36",
    "/escala-6x2",
    "/escala-3x3",
    "/privacidade",
    "/termos",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
