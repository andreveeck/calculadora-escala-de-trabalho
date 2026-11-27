"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/infrastructure/supabase/client";

type AccessStatus = "pending_payment" | "approved" | "blocked";
type AdminState = "checking" | "signed_out" | "forbidden" | "authenticated";

type AccessUser = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  access_status: AccessStatus;
  created_at: string;
  updated_at: string;
};

type Payment = {
  id: string;
  user_id: string;
  provider: string;
  status: "pending" | "approved" | "rejected";
  amount: number | string | null;
  created_at: string;
};

export function AdminPanel() {
  const supabase = createBrowserSupabaseClient();
  const [adminState, setAdminState] = useState<AdminState>(() =>
    supabase ? "checking" : "signed_out",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() =>
    supabase ? "" : "Supabase ainda não configurado.",
  );
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!active) return;
      if (userError || !data.user) {
        setAdminState("signed_out");
        return;
      }

      const isAdmin = await checkAdminRole(data.user.id);
      if (!active) return;
      setAdminState(isAdmin ? "authenticated" : "forbidden");
      if (isAdmin) void loadAdminData();
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  const metrics = useMemo(
    () => [
      { label: "Usuários", value: String(users.length), hint: "Cadastrados" },
      {
        label: "Pendentes",
        value: String(users.filter((user) => user.access_status === "pending_payment").length),
        hint: "Pagamento",
      },
      {
        label: "Liberados",
        value: String(users.filter((user) => user.access_status === "approved").length),
        hint: "Acesso anual",
      },
      {
        label: "Bloqueados",
        value: String(users.filter((user) => user.access_status === "blocked").length),
        hint: "Sem acesso",
      },
      {
        label: "Pagamentos",
        value: String(payments.length),
        hint: "Registrados",
      },
      {
        label: "Receita",
        value: formatCurrency(
          payments
            .filter((payment) => payment.status === "approved")
            .reduce((total, payment) => total + Number(payment.amount ?? 0), 0),
        ),
        hint: "Aprovada",
      },
    ],
    [payments, users],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase ainda não configurado.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      // O login administrativo passa pelo servidor: só assim existe limite de
      // tentativas por IP/conta e resposta uniforme para credencial inválida.
      const response = await fetch("/api/access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = (await response.json()) as {
        user?: { id: string } | null;
        accessToken?: string | null;
        refreshToken?: string | null;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível entrar.");
      }

      if (!payload.accessToken || !payload.refreshToken || !payload.user) {
        throw new Error("Não foi possível iniciar sua sessão. Tente novamente.");
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });
      if (sessionError || !sessionData.user) {
        throw new Error("Não foi possível iniciar sua sessão. Tente novamente.");
      }

      const isAdmin = await checkAdminRole(sessionData.user.id);
      if (!isAdmin) {
        setAdminState("forbidden");
        return;
      }

      setAdminState("authenticated");
      await loadAdminData();
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setAdminState("signed_out");
    setUsers([]);
    setPayments([]);
    setPassword("");
    setError("");
  }

  async function loadAdminData() {
    setIsLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/access-users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        users?: AccessUser[];
        payments?: Payment[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível carregar o painel.");
      }

      setUsers(payload.users ?? []);
      setPayments(payload.payments ?? []);
    } catch (caught) {
      setError(toMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateAccess(userId: string, accessStatus: AccessStatus) {
    setIsLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/access-users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, accessStatus }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível atualizar o acesso.");
      }

      await loadAdminData();
    } catch (caught) {
      setError(toMessage(caught));
      setIsLoading(false);
    }
  }

  async function deleteUser(user: AccessUser) {
    const userName = user.name ?? user.email ?? "este usuário";
    const confirmed = window.confirm(
      `Excluir ${userName}? Esta ação remove a conta e o acesso anual do usuário.`,
    );
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/access-users", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Não foi possível excluir o usuário.");
      }

      await loadAdminData();
    } catch (caught) {
      setError(toMessage(caught));
      setIsLoading(false);
    }
  }

  if (adminState === "checking") {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p className="eyebrow">Área administrativa</p>
          <h1>Verificando sua sessão</h1>
        </section>
      </main>
    );
  }

  if (adminState === "forbidden") {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p className="eyebrow">Área administrativa</p>
          <h1>Acesso não autorizado</h1>
          <p>Sua conta está autenticada, mas não possui a função de administrador.</p>
          <button type="button" className="access-secondary-button" onClick={handleLogout}>
            Sair desta conta
          </button>
        </section>
      </main>
    );
  }

  if (adminState === "signed_out") {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card" aria-label="Login administrativo">
          <p className="eyebrow">Área administrativa</p>
          <h1>Entrar no painel</h1>
          <p>Use uma conta do Supabase Auth cujo profile tenha role=admin.</p>

          <form className="admin-login-form" onSubmit={handleLogin}>
            <label>
              <span>E-mail</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@seudominio.com"
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Área administrativa</p>
          <h1>Painel Minha Escala</h1>
          <p>Confirme o pagamento no PagBank antes de liberar o acesso anual.</p>
        </div>
        <button className="admin-lock" type="button" onClick={handleLogout}>
          Sair
        </button>
      </div>

      <section className="admin-grid">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      {error ? <p className="admin-inline-error">{error}</p> : null}

      <section className="admin-layout">
        <article className="admin-panel users-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Usuários do acesso anual</h2>
              <p>Status pendente, liberado e bloqueado armazenado no Supabase.</p>
            </div>
            <button type="button" onClick={loadAdminData} disabled={isLoading}>
              {isLoading ? "Carregando" : "Atualizar"}
            </button>
          </div>

          <div className="admin-table" role="table" aria-label="Usuários cadastrados">
            <div className="admin-table-row admin-table-head users-table-head" role="row">
              <span role="columnheader">Nome</span>
              <span role="columnheader">E-mail</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Ação</span>
            </div>
            {users.length === 0 ? (
              <div className="admin-empty-state">Nenhum usuário cadastrado.</div>
            ) : (
              users.map((user) => (
                <div className="admin-table-row users-table-row" role="row" key={user.id}>
                  <span role="cell">{user.name ?? "Sem nome"}</span>
                  <span role="cell">{user.email ?? "Sem e-mail"}</span>
                  <span role="cell">{formatAccessStatus(user.access_status)}</span>
                  <strong className="admin-user-actions">
                    {user.access_status === "approved" ? (
                      <button
                        type="button"
                        className="admin-danger-button"
                        disabled={isLoading}
                        onClick={() => updateAccess(user.user_id, "blocked")}
                      >
                        Bloquear usuário
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => updateAccess(user.user_id, "approved")}
                      >
                        Liberar usuário
                      </button>
                    )}
                    {user.role !== "admin" ? (
                      <button
                        type="button"
                        className="admin-delete-button"
                        disabled={isLoading}
                        onClick={() => deleteUser(user)}
                      >
                        Excluir usuário
                      </button>
                    ) : null}
                  </strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-panel payments-panel users-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Histórico básico de pagamentos</h2>
              <p>Liberações manuais são registradas como pagamentos PagBank aprovados.</p>
            </div>
          </div>
          <div className="admin-table" role="table" aria-label="Pagamentos recentes">
            <div className="admin-table-row admin-table-head" role="row">
              <span role="columnheader">Data</span>
              <span role="columnheader">Usuário</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Valor</span>
            </div>
            {payments.length === 0 ? (
              <div className="admin-empty-state">Nenhum pagamento registrado.</div>
            ) : (
              payments.map((payment) => (
                <div className="admin-table-row" role="row" key={payment.id}>
                  <span role="cell">{formatDate(payment.created_at)}</span>
                  <span role="cell">{userLabel(payment.user_id, users)}</span>
                  <span role="cell">{payment.status}</span>
                  <strong role="cell">
                    {payment.amount == null ? "Não informado" : formatCurrency(Number(payment.amount))}
                  </strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

async function checkAdminRole(userId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();

  return !error && data?.role === "admin";
}

async function getAccessToken(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error("Supabase ainda não configurado.");

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  return data.session.access_token;
}

function formatAccessStatus(status: AccessStatus): string {
  const labels: Record<AccessStatus, string> = {
    pending_payment: "Aguardando pagamento",
    approved: "Liberado",
    blocked: "Bloqueado",
  };
  return labels[status];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function userLabel(userId: string, users: AccessUser[]): string {
  const user = users.find((candidate) => candidate.user_id === userId);
  return user?.email ?? user?.name ?? userId;
}

function toMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Não foi possível concluir a operação.";
  if (error.message === "Invalid login credentials") return "E-mail ou senha incorretos.";
  if (error.message === "Email not confirmed") return "Confirme o e-mail antes de entrar.";
  return error.message;
}
