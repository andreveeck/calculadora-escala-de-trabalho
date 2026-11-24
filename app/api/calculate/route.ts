import { createScheduleController } from "@/src/controllers/controllerFactory";
import { authenticateRequest } from "@/src/infrastructure/supabase/server";
import {
  scheduleTypes,
  type ScheduleType,
} from "@/src/models/schedules/ScheduleType";

export async function POST(request: Request): Promise<Response> {
  // O cálculo alimenta o calendário anual, que é conteúdo pago. A rota não é
  // usada pela calculadora gratuita (ela roda no cliente), então exigir acesso
  // liberado aqui não tira nada de quem só quer ver a escala do mês.
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return Response.json(
      { message: "Faça login para calcular." },
      { status: 401 },
    );
  }

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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const scheduleType = String(body.scheduleType);
    if (!scheduleTypes.includes(scheduleType as ScheduleType)) {
      throw new Error("Escolha uma escala válida.");
    }

    // body.today é ignorado intencionalmente: o servidor usa sempre
    // a data atual para evitar manipulação client-side.
    const result = createScheduleController().calculate({
      scheduleType: scheduleType as ScheduleType,
      referenceDate: String(body.referenceDate),
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Não foi possível calcular.",
      },
      { status: 400 },
    );
  }
}
