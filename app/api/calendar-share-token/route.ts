import { generateShareToken } from "@/src/shared/tokens/calendarShareToken";

const VALID_TYPES = new Set(["6x1", "12x36", "6x2", "3x3"]);

export async function POST(request: Request): Promise<Response> {
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
