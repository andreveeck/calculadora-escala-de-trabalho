import { createScheduleController } from "@/src/controllers/controllerFactory";
import {
  scheduleTypes,
  type ScheduleType,
} from "@/src/models/schedules/ScheduleType";

export async function POST(request: Request): Promise<Response> {
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
