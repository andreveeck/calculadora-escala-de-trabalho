"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/client";

export function SiteNavigation() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    let active = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active || error) return;
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="site-nav" aria-label="Navegação principal">
      <Link href="/">Calculadora</Link>
      <Link href="/calendario-anual">Calendário anual</Link>
      <Link
        className={`site-nav-cta${email ? " site-nav-account" : ""}`}
        href="/acesso"
        title={email ? `Conta conectada: ${email}` : undefined}
      >
        {email ? (
          <>
            <span className="site-nav-account-label">Conta conectada</span>
            <span className="site-nav-account-email">{email}</span>
          </>
        ) : (
          "Acessar minha conta"
        )}
      </Link>
    </nav>
  );
}
