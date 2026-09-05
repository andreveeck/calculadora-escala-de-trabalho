import { SupabaseLeadRepository } from "@/src/infrastructure/supabase/SupabaseLeadRepository";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request: Request): Promise<Response> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return Response.json(
      { message: "Supabase ainda não configurado." },
      { status: 503 },
    );
  }

  let body: { email?: string; consent?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!body.email || body.consent !== true) {
    return Response.json(
      { message: "Informe email e consentimento." },
      { status: 400 },
    );
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  if (
    !EMAIL_REGEX.test(normalizedEmail) ||
    normalizedEmail.length > MAX_EMAIL_LENGTH
  ) {
    return Response.json(
      { message: "Formato de e-mail inválido." },
      { status: 400 },
    );
  }

  const lead = await new SupabaseLeadRepository(supabase).create(
    normalizedEmail,
    body.consent,
  );

  return Response.json(lead, { status: 201 });
}
