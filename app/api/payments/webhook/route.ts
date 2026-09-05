import { createPaymentController } from "@/src/controllers/paymentControllerFactory";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const controller = createPaymentController();

  if (!rawBody || !controller) {
    return Response.json({ message: "Webhook inválido." }, { status: 401 });
  }

  let payload: { data?: { id?: string }; id?: string };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return Response.json({ message: "Payload inválido." }, { status: 400 });
  }

  const externalId = payload.data?.id ?? payload.id ?? "";

  try {
    await controller.handleWebhook({ rawBody, signature, requestId, externalId });
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
