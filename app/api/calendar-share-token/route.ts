import { generateShareToken } from "@/src/shared/tokens/calendarShareToken";
import { authenticateRequest } from "@/src/infrastructure/supabase/server";

const VALID_TYPES = new Set(["6x1", "12x36", "6x2", "3x3"]);

export async function POST(request: Request): Promise<Response> {
  // O calendário anual é conteúdo pago: só um usuário autenticado pode gerar
  // um link de compartilhamento.
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return Response.json(
      { message: "Faça login para gerar o link do calendário anual." },
      { status: 401 },
    );
  }

  // Lê o próprio perfil com o token do usuário: a policy de ownership garante
  // o isolamento e a rota não depende de privilégio de service role.
  const { data: profile, error: profileError } = await authenticated.userClient
    .from("profiles")
    .select("access_status")
    .eq("user_id", authenticated.user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json(
      { message: "Não foi possível verificar seu acesso." },
      { status: 500 },
    );
  }

  if (profile?.access_status !== "approved") {
    return Response.json(
      { message: "Seu acesso ao calendário anual ainda não foi liberado." },
      { status: 403 },
    );
  }

  let body: { scheduleType?: string; referenceDate?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const { scheduleType, referenceDate } = body;

  if (!scheduleType || !VALID_TYPES.has(scheduleType)) {
    return Response.json({ message: "Tipo de escala inválido." }, { status: 400 });
  }

  if (!referenceDate || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return Response.json({ message: "Data de referência inválida." }, { status: 400 });
  }

  const token = generateShareToken({ scheduleType, referenceDate });
  if (!token) {
    return Response.json(
      { message: "Token de compartilhamento não configurado." },
      { status: 503 },
    );
  }

  return Response.json({ token });
}
