import {
  authenticateAdminRequest,
  type AuthenticatedRequest,
} from "@/src/infrastructure/supabase/server";
import { SafeLogger } from "@/src/infrastructure/logging/SafeLogger";
import {
  consumeRateLimit,
  tooManyRequestsResponse,
} from "@/src/infrastructure/security/rateLimit";

type AccessStatus = "pending_payment" | "approved" | "blocked";

const allowedStatuses = new Set<AccessStatus>([
  "pending_payment",
  "approved",
  "blocked",
]);

const logger = new SafeLogger();

/**
 * Autoriza a requisição (papel admin no banco + perfil não bloqueado) e aplica
 * um limite por administrador. Um token vazado não consegue varrer a base em
 * loop nem inundar o banco com escritas.
 */
type AdminAuthorization =
  | { authenticated: AuthenticatedRequest; error: null }
  | { authenticated: null; error: Response };

async function authorizeAdmin(
  request: Request,
  kind: "read" | "write",
): Promise<AdminAuthorization> {
  const authenticated = await authenticateAdminRequest(request);
  if (!authenticated) {
    return { authenticated: null, error: unauthorizedResponse() };
  }

  const limit = consumeRateLimit(
    `admin:${kind}:${authenticated.user.id}`,
    kind === "read" ? 120 : 30,
    60_000,
  );

  if (!limit.allowed) {
    return {
      authenticated: null,
      error: tooManyRequestsResponse(
        limit,
        "Muitas requisições administrativas. Aguarde um instante.",
      ),
    };
  }

  return { authenticated, error: null };
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authorizeAdmin(request, "read");
  if (!auth.authenticated) {
    return auth.error;
  }
  const authenticated = auth.authenticated;

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
    return json(
      { message: "Não foi possível listar usuários e pagamentos." },
      500,
    );
  }

  return json({
    users: profilesResult.data ?? [],
    payments: paymentsResult.data ?? [],
  });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdmin(request, "write");
  if (!auth.authenticated) {
    return auth.error;
  }
  const authenticated = auth.authenticated;

  let body: { userId?: string; accessStatus?: AccessStatus };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ message: "Corpo da requisição inválido." }, 400);
  }

  const userId = body.userId?.trim() ?? "";
  const accessStatus = body.accessStatus;
  if (!userId || !accessStatus || !allowedStatuses.has(accessStatus)) {
    return json({ message: "Usuário ou status de acesso inválido." }, 400);
  }

  // Um admin não altera o próprio status: evita auto-bloqueio acidental e
  // impede que um token roubado tranque o dono do painel para fora.
  if (userId === authenticated.user.id) {
    return json(
      { message: "Você não pode alterar o próprio status de acesso." },
      400,
    );
  }

  const { data: currentProfile, error: currentError } =
    await authenticated.adminClient
      .from("profiles")
      .select("id,user_id,access_status")
      .eq("user_id", userId)
      .maybeSingle();

  if (currentError || !currentProfile) {
    return json({ message: "Usuário não encontrado." }, 404);
  }

  const { data: updatedProfile, error: updateError } =
    await authenticated.adminClient
      .from("profiles")
      .update({ access_status: accessStatus })
      .eq("user_id", userId)
      .select("id,user_id,name,email,role,access_status,created_at,updated_at")
      .single();

  if (updateError || !updatedProfile) {
    return json({ message: "Não foi possível atualizar o acesso do usuário." }, 500);
  }

  logger.info("admin.access_status.updated", {
    actorUserId: authenticated.user.id,
    targetUserId: userId,
    previousStatus: currentProfile.access_status,
    accessStatus,
  });

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

      return json(
        { message: "O pagamento não pôde ser registrado; o acesso não foi alterado." },
        500,
      );
    }
  }

  return json({ user: updatedProfile });
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await authorizeAdmin(request, "write");
  if (!auth.authenticated) {
    return auth.error;
  }
  const authenticated = auth.authenticated;

  let body: { userId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ message: "Corpo da requisição inválido." }, 400);
  }

  const userId = body.userId?.trim() ?? "";
  if (!userId) {
    return json({ message: "Usuário inválido." }, 400);
  }

  if (userId === authenticated.user.id) {
    return json(
      { message: "Você não pode excluir sua própria conta administrativa." },
      400,
    );
  }

  const { data: currentProfile, error: currentError } =
    await authenticated.adminClient
      .from("profiles")
      .select("id,user_id,role")
      .eq("user_id", userId)
      .maybeSingle();

  if (currentError || !currentProfile) {
    return json({ message: "Usuário não encontrado." }, 404);
  }

  // Exclusão de conta administrativa só pelo Supabase (fora do painel), para
  // que um admin não apague o outro nem um token vazado remova a equipe.
  if (currentProfile.role === "admin") {
    return json(
      { message: "Contas administrativas não podem ser excluídas pelo painel." },
      400,
    );
  }

  const { error: deleteError } =
    await authenticated.adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return json({ message: "Não foi possível excluir o usuário." }, 500);
  }

  logger.info("admin.user.deleted", {
    actorUserId: authenticated.user.id,
    targetUserId: userId,
  });

  return json({ deletedUserId: userId });
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function unauthorizedResponse(): Response {
  return json({ message: "Acesso restrito a administradores autenticados." }, 403);
}
