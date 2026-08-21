"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/client";

type AccessStatus = "pending_payment" | "approved" | "blocked";

type Profile = {
  name: string | null;
  email: string | null;
  access_status: AccessStatus;
};

type AccessState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "email_confirmation"; email: string }
  | { kind: "authenticated"; user: User; profile: Profile };

const pagBankPaymentUrl = "https://pag.ae/8255taD9t/button";
const pagBankButtonImageUrl =
  "https://assets.pagseguro.com.br/ps-integration-assets/botoes/pagamentos/205x30-pagar.gif";

export function AccessFlow() {
  const supabase = createBrowserSupabaseClient();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AccessState>(() =>
    supabase ? { kind: "loading" } : { kind: "signed_out" },
  );
  const [error, setError] = useState(() =>
    supabase ? "" : "Supabase ainda não configurado.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!active) return;
      if (userError || !data.user) {
        setState({ kind: "signed_out" });
        return;
      }

      try {
        const profile = await loadOwnProfile(data.user.id);
        if (active) {
          setState({ kind: "authenticated", user: data.user, profile });
        }
      } catch (caught) {
        if (active) {
          setError(toMessage(caught));
          setState({ kind: "signed_out" });
        }
      }
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase ainda não configurado.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        const normalizedName = name.trim();
        if (!normalizedName) {
          throw new Error("Informe seu nome.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { name: normalizedName },
            emailRedirectTo: buildAccessRedirectUrl(),
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Não foi possível criar a conta.");

        if (!data.session) {
          setState({
            kind: "email_confirmation",
            email: data.user.email ?? email.trim(),
          });
          return;
        }

        const profile = await loadOwnProfile(data.user.id);
        setState({ kind: "authenticated", user: data.user, profile });
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
        if (signInError) throw signInError;

        const profile = await loadOwnProfile(data.user.id);
        setState({ kind: "authenticated", user: data.user, profile });
      }
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setState({ kind: "signed_out" });
    setPassword("");
  }

  if (state.kind === "loading") {
    return (
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Acesso anual</p>
          <h1>Verificando sua sessão</h1>
        </section>
      </main>
    );
  }

  if (state.kind === "email_confirmation") {
    return (
      <AccessStatus
        accessStatus="pending_payment"
        confirmationEmail={state.email}
        onLogout={logout}
      />
    );
  }

  if (state.kind === "authenticated") {
    return (
      <AccessStatus
        accessStatus={state.profile.access_status}
        displayName={state.profile.name ?? state.user.email ?? "Usuário"}
        onLogout={logout}
      />
    );
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <p className="eyebrow">Acesso anual</p>
        <h1>{mode === "register" ? "Criar login" : "Entrar"}</h1>
        <p>
          Cadastre seu login para pagar pelo PagBank. Após a confirmação, o
          administrador libera seu calendário anual.
        </p>

        <div className="access-mode" aria-label="Escolha o modo de acesso">
          <button
            type="button"
            className={mode === "register" ? "selected" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Criar conta
          </button>
          <button
            type="button"
            className={mode === "login" ? "selected" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Já tenho conta
          </button>
        </div>

        <form className="access-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>
              <span>Nome</span>
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
              />
            </label>
          ) : null}

          <label>
            <span>E-mail</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              required
              minLength={6}
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde..." : "Continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function buildAccessRedirectUrl(): string {
  return new URL("/acesso", window.location.origin).toString();
}

async function loadOwnProfile(userId: string): Promise<Profile> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase ainda não configurado.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("name,email,access_status")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível carregar seu perfil de acesso.");
  }

  return data as Profile;
}

function AccessStatus({
  accessStatus,
  displayName,
  confirmationEmail,
  onLogout,
}: {
  accessStatus: AccessStatus;
  displayName?: string;
  confirmationEmail?: string;
  onLogout: () => Promise<void>;
}) {
  if (accessStatus === "approved") {
    return (
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Acesso liberado</p>
          <h1>Seu calendário anual está pronto</h1>
          <p>{displayName}, você já pode consultar seus 12 meses.</p>
          <a className="access-primary-link" href="/calendario-anual">
            Abrir calendário anual
          </a>
          <button className="access-secondary-button" type="button" onClick={onLogout}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  if (accessStatus === "blocked") {
    return (
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Acesso bloqueado</p>
          <h1>Fale com o atendimento</h1>
          <p>Seu cadastro está bloqueado e o calendário anual não pode ser aberto.</p>
          <button className="access-secondary-button" type="button" onClick={onLogout}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <p className="eyebrow">Pagamento pendente</p>
        <h1>Finalize pelo PagBank</h1>
        {confirmationEmail ? (
          <p>
            Enviamos a confirmação de cadastro para <strong>{confirmationEmail}</strong>.
            Confirme o e-mail antes de entrar novamente.
          </p>
        ) : (
          <p>
            Faça o pagamento pelo PagBank. Depois da confirmação por e-mail, o
            administrador libera seu acesso.
          </p>
        )}

        <div className="payment-actions">
          <a
            className="pagbank-payment-button"
            href={pagBankPaymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Pagar com PagBank"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem oficial do botão PagBank. */}
            <img
              src={pagBankButtonImageUrl}
              alt="Pague com PagBank - é rápido, grátis e seguro!"
            />
          </a>
          <button className="access-secondary-button" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </section>
    </main>
  );
}

function toMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Não foi possível continuar.";
  }

  const translations: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered": "Este e-mail já está cadastrado.",
  };

  return translations[error.message] ?? error.message;
}
