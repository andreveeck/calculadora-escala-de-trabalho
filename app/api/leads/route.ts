import { SupabaseLeadRepository } from "@/src/infrastructure/supabase/SupabaseLeadRepository";
import { createServerSupabaseClient } from "@/src/infrastructure/supabase/server";

export async function POST(request: Request): Promise<Response> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return Response.json(
      { message: "Supabase ainda não configurado." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { email?: string; consent?: boolean };
  if (!body.email || body.consent !== true) {
    return Response.json(
      { message: "Informe email e consentimento." },
      { status: 400 },
    );
  }

  const lead = await new SupabaseLeadRepository(supabase).create(
    body.email,
    body.consent,
  );

  return Response.json(lead, { status: 201 });
}
