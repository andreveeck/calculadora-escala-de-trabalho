import { createPaymentController } from "@/src/controllers/paymentControllerFactory";
import { authenticateRequest } from "@/src/infrastructure/supabase/server";

export async function POST(request: Request): Promise<Response> {
  const authenticated = await authenticateRequest(request);
  if (!authenticated) {
    return Response.json(
      { message: "Faça login para iniciar um pagamento." },
      { status: 401 },
    );
  }

  const controller = createPaymentController();
  if (!controller) {
    return Response.json(
      { message: "Pagamento ainda não configurado." },
      { status: 503 },
    );
  }

  try {
    const checkout = await controller.startCheckout(authenticated.user.id);
    return Response.json(checkout, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o checkout.",
      },
      { status: 400 },
    );
  }
}
