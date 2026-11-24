import { authenticateRequest } from "@/src/infrastructure/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return Response.json(
      { message: "Faça login para continuar." },
      { status: 401 },
    );
  }

  const { data: profile, error } = await authenticated.userClient
    .from("profiles")
    .select("id,user_id,name,email,role,access_status,created_at,updated_at")
    .eq("user_id", authenticated.user.id)
    .maybeSingle();

  // Falha de leitura (banco sem grants, RLS, conexão) não é "perfil ausente":
  // antes as duas situações saíam como 404 e escondiam o problema real.
  if (error) {
    return Response.json(
      { message: "Não foi possível ler seu perfil de acesso." },
      { status: 500 },
    );
  }

  if (!profile) {
    return Response.json(
      { message: "Perfil não encontrado." },
      { status: 404 },
    );
  }

  return Response.json({ profile });
}
