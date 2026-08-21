import { createPublicServerSupabaseClient } from "@/src/infrastructure/supabase/server";
import type { User } from "@supabase/supabase-js";

const alreadyRegisteredEmailMessage =
  "Este e-mail já está cadastrado. Use a opção Entrar para acessar sua conta.";

export async function POST(request: Request): Promise<Response> {
  const supabase = createPublicServerSupabaseClient();
  if (!supabase) {
    return Response.json(
      { message: "Supabase ainda não configurado." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!name || !email || password.length < 6) {
      return Response.json(
        { message: "Informe nome, e-mail e uma senha com pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: new URL("/acesso", request.url).toString(),
      },
    });

    if (isAlreadyRegisteredAuthError(error)) {
      return Response.json(
        { message: alreadyRegisteredEmailMessage },
        { status: 409 },
      );
    }

    if (error) {
      throw error;
    }

    if (isAlreadyRegisteredSignUp(data.user)) {
      return Response.json(
        { message: alreadyRegisteredEmailMessage },
        { status: 409 },
      );
    }

    return Response.json(
      {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        accessToken: data.session?.access_token ?? null,
        requiresEmailConfirmation: !data.session,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Não foi possível cadastrar.",
      },
      { status: 400 },
    );
  }
}

function isAlreadyRegisteredSignUp(user: User | null): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

function isAlreadyRegisteredAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeAuthError = error as { code?: unknown; message?: unknown };
  return (
    maybeAuthError.code === "user_already_exists" ||
    maybeAuthError.message === "User already registered"
  );
}
