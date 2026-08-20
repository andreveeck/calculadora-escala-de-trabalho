import { createPaymentController } from "@/src/controllers/paymentControllerFactory";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const controller = createPaymentController();

  if (!rawBody || !signature || !controller) {
    return Response.json({ message: "Webhook inválido." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    data?: { id?: string };
    id?: string;
  };
  const externalId = payload.data?.id ?? payload.id ?? "";

  try {
    await controller.handleWebhook({ rawBody, signature, externalId });
    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Webhook não processado.",
      },
      { status: 400 },
    );
  }
}
