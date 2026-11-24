export const connectionErrorMessage =
  "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e, se o problema continuar, confirme a configuração do Supabase (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).";

/**
 * Identifica falhas de rede/DNS ao falar com o Supabase Auth, que o SDK
 * devolve como "fetch failed" ou "Failed to fetch". Sem isso o usuário do
 * formulário de login vê apenas o erro técnico em inglês.
 */
export function isConnectionFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { message?: unknown; name?: unknown };
  const message = String(candidate.message ?? "").toLowerCase();

  return (
    candidate.name === "AuthRetryableFetchError" ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("err_name_not_resolved")
  );
}
