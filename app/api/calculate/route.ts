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

    const result = createScheduleController().calculate({
      scheduleType: scheduleType as ScheduleType,
      referenceDate: String(body.referenceDate),
      today: typeof body.today === "string" ? body.today : undefined,
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
