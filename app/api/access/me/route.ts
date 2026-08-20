import { authenticateRequest } from "@/src/infrastructure/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return Response.json(
      { message: "Faça login para continuar." },
      { status: 401 },
    );
  }

  const { data: profile, error } = await authenticated.adminClient
    .from("profiles")
    .select("id,user_id,name,email,role,access_status,created_at,updated_at")
    .eq("user_id", authenticated.user.id)
    .maybeSingle();

  if (error || !profile) {
    return Response.json(
      { message: "Perfil não encontrado." },
      { status: 404 },
    );
  }

  return Response.json({ profile });
}
