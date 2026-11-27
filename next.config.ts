import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Conexões do Supabase Auth/PostgREST usadas pelo cliente no browser.
const supabaseOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSocketOrigin = supabaseOrigin?.replace(/^http/, "ws") ?? null;

const contentSecurityPolicy = [
  "default-src 'self'",
  // O App Router injeta scripts inline de bootstrap. Sem middleware com nonce,
  // 'unsafe-inline' é necessário; eval fica restrito ao modo de desenvolvimento.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://assets.pagseguro.com.br",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin ?? "https://*.supabase.co"} ${
    supabaseSocketOrigin ?? "wss://*.supabase.co"
  }`,
  "frame-src 'self'",
  // Impede que o painel administrativo seja embutido em outro site.
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Página do painel não deve ser indexada. O Cache-Control é definido
        // pelo próprio Next (no-cache, must-revalidate) para páginas.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/acesso/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
