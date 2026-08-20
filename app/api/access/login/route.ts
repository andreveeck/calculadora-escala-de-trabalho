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
      email?: string;
      password?: string;
    };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email?.trim().toLowerCase() ?? "",
      password: body.password ?? "",
    });

    if (error) {
      throw error;
    }

    return Response.json({
      user: { id: data.user.id, email: data.user.email },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Não foi possível entrar.",
      },
      { status: 401 },
    );
  }
}
