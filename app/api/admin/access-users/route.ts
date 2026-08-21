import { authenticateAdminRequest } from "@/src/infrastructure/supabase/server";

type AccessStatus = "pending_payment" | "approved" | "blocked";

const allowedStatuses = new Set<AccessStatus>([
  "pending_payment",
  "approved",
  "blocked",
]);

export async function GET(request: Request): Promise<Response> {
  const authenticated = await authenticateAdminRequest(request);
  if (!authenticated) {
    return unauthorizedResponse();
  }

  const [profilesResult, paymentsResult] = await Promise.all([
    authenticated.adminClient
      .from("profiles")
      .select("id,user_id,name,email,role,access_status,created_at,updated_at")
      .order("created_at", { ascending: false }),
    authenticated.adminClient
      .from("payments")
      .select("id,user_id,provider,status,amount,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (profilesResult.error || paymentsResult.error) {
    return Response.json(
      { message: "Não foi possível listar usuários e pagamentos." },
      { status: 500 },
    );
  }

  return Response.json({
    users: profilesResult.data ?? [],
    payments: paymentsResult.data ?? [],
  });
}

export async function POST(request: Request): Promise<Response> {
  const authenticated = await authenticateAdminRequest(request);
  if (!authenticated) {
    return unauthorizedResponse();
  }

  let body: { userId?: string; accessStatus?: AccessStatus };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const userId = body.userId?.trim() ?? "";
  const accessStatus = body.accessStatus;
  if (!userId || !accessStatus || !allowedStatuses.has(accessStatus)) {
    return Response.json(
      { message: "Usuário ou status de acesso inválido." },
      { status: 400 },
    );
  }

  const { data: currentProfile, error: currentError } =
    await authenticated.adminClient
      .from("profiles")
      .select("id,user_id,access_status")
      .eq("user_id", userId)
      .maybeSingle();

  if (currentError || !currentProfile) {
    return Response.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  const { data: updatedProfile, error: updateError } =
    await authenticated.adminClient
      .from("profiles")
      .update({ access_status: accessStatus })
      .eq("user_id", userId)
      .select("id,user_id,name,email,role,access_status,created_at,updated_at")
      .single();

  if (updateError || !updatedProfile) {
    return Response.json(
      { message: "Não foi possível atualizar o acesso do usuário." },
      { status: 500 },
    );
  }

  if (
    accessStatus === "approved" &&
    currentProfile.access_status !== "approved"
  ) {
    const { error: paymentError } = await authenticated.adminClient
      .from("payments")
      .insert({
        user_id: userId,
        provider: "pagbank",
        status: "approved",
        amount: null,
      });

    if (paymentError) {
      await authenticated.adminClient
        .from("profiles")
        .update({ access_status: currentProfile.access_status })
        .eq("user_id", userId);

      return Response.json(
        { message: "O pagamento não pôde ser registrado; o acesso não foi alterado." },
        { status: 500 },
      );
    }
  }

  return Response.json({ user: updatedProfile });
}

export async function DELETE(request: Request): Promise<Response> {
  const authenticated = await authenticateAdminRequest(request);
  if (!authenticated) {
    return unauthorizedResponse();
  }

  let body: { userId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const userId = body.userId?.trim() ?? "";
  if (!userId) {
    return Response.json({ message: "Usuário inválido." }, { status: 400 });
  }

  if (userId === authenticated.user.id) {
    return Response.json(
      { message: "Você não pode excluir sua própria conta administrativa." },
      { status: 400 },
    );
  }

  const { data: currentProfile, error: currentError } =
    await authenticated.adminClient
      .from("profiles")
      .select("id,user_id")
      .eq("user_id", userId)
      .maybeSingle();

  if (currentError || !currentProfile) {
    return Response.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  const { error: deleteError } =
    await authenticated.adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return Response.json(
      { message: "Não foi possível excluir o usuário." },
      { status: 500 },
    );
  }

  return Response.json({ deletedUserId: userId });
}

function unauthorizedResponse(): Response {
  return Response.json(
    { message: "Acesso restrito a administradores autenticados." },
    { status: 403 },
  );
}
