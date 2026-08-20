import { createPublicServerSupabaseClient } from "@/src/infrastructure/supabase/server";

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
      options: { data: { name } },
    });

    if (error) {
      throw error;
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
