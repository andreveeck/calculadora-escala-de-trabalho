import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSiteUrl } from "@/src/views/presenters/siteUrl";
import { SiteNavigation } from "@/src/views/components/SiteNavigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Minha Escala",
    template: "%s",
  },
  description:
    "Calculadora brasileira de escalas de trabalho 6x1, 12x36, 6x2 e 3x3.",
  verification: {
    google: "kWzYP7a99izKNojnNBZiZMrVHx9n9WDn2NZTv7yKvh4",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Minha Escala",
    description:
      "Veja seus dias de trabalho, folga, próxima pausa e calendário do mês.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* Extensões de navegador (ex.: ColorZilla adiciona cz-shortcut-listen)
          alteram o <body> antes da hidratação; sem isto o React 19 acusa
          mismatch de atributo em desenvolvimento. Só afeta atributos do body. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="site-brand" href="/" aria-label="Minha Escala - início">
              <span className="site-brand-mark">
                {/* eslint-disable-next-line @next/next/no-img-element -- marca local em SVG, sem custo de otimização. */}
                <img src="/favicon.svg" alt="" width="36" height="36" />
              </span>
              <span>
                <strong>Minha Escala</strong>
                <small>Seu calendário de trabalho</small>
              </span>
            </Link>

            <SiteNavigation />
          </div>
        </header>

        <div className="site-content">{children}</div>

        <footer className="site-footer">
          <div>
            <span>© 2026 Minha Escala</span>
            <nav aria-label="Links legais">
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/termos">Termos de uso</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
