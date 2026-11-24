import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { MercadoPagoGateway } from "../src/infrastructure/mercado-pago/MercadoPagoGateway";

const WEBHOOK_SECRET = "segredo-de-teste-do-webhook-123456";
const OTHER_SECRET = "outro-segredo-de-teste-987654";
const rawBody = JSON.stringify({
  type: "payment",
  action: "payment.updated",
  data: { id: "123456789" },
});

function buildGateway(webhookSecret: string = WEBHOOK_SECRET): MercadoPagoGateway {
  return new MercadoPagoGateway({
    accessToken: "token-de-teste",
    webhookSecret,
    appUrl: "http://localhost:3000",
  });
}

function hmac(payload: string, secret: string = WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

test("aceita a assinatura HMAC-SHA256 válida do corpo bruto", () => {
  const gateway = buildGateway();

  assert.equal(
    gateway.verifyWebhookSignature(rawBody, hmac(rawBody), "req-1"),
    true,
  );
  assert.equal(
    gateway.verifyWebhookSignature(rawBody, `sha256=${hmac(rawBody)}`, "req-1"),
    true,
  );
  assert.equal(
    gateway.verifyWebhookSignature(rawBody, hmac(rawBody).toUpperCase(), null),
    true,
  );
});

test("rejeita assinatura HMAC divergente", () => {
  const gateway = buildGateway();

  assert.equal(
    gateway.verifyWebhookSignature(rawBody, hmac("outro-payload"), "req-1"),
    false,
  );
  assert.equal(gateway.verifyWebhookSignature(rawBody, "deadbeef", "req-1"), false);
  assert.equal(
    gateway.verifyWebhookSignature(rawBody, hmac(rawBody, OTHER_SECRET), "req-1"),
    false,
  );
});

test("rejeita assinatura ausente ou vazia", () => {
  const gateway = buildGateway();

  assert.equal(gateway.verifyWebhookSignature(rawBody, null, "req-1"), false);
  assert.equal(gateway.verifyWebhookSignature(rawBody, "", "req-1"), false);
  assert.equal(gateway.verifyWebhookSignature(rawBody, "   ", "req-1"), false);
});

test("rejeita corpo adulterado mantendo a assinatura original", () => {
  const gateway = buildGateway();
  const signature = hmac(rawBody);
  const tamperedBody = rawBody.replace("payment.updated", "payment.approved");

  assert.equal(gateway.verifyWebhookSignature(tamperedBody, signature, "req-1"), false);
});

test("rejeita tudo quando o segredo do webhook não está configurado", () => {
  const gateway = buildGateway("");

  assert.equal(gateway.verifyWebhookSignature(rawBody, hmac(rawBody), "req-1"), false);
});

test("aceita o formato oficial do Mercado Pago (ts/v1) e rejeita v1 inválido", () => {
  const gateway = buildGateway();
  const ts = "1704908010";
  const requestId = "req-oficial-1";
  const manifest = `id:123456789;request-id:${requestId};ts:${ts};`;

  assert.equal(
    gateway.verifyWebhookSignature(
      rawBody,
      `ts=${ts},v1=${hmac(manifest)}`,
      requestId,
    ),
    true,
  );
  assert.equal(
    gateway.verifyWebhookSignature(
      rawBody,
      `ts=${ts},v1=${hmac(`id:123456789;request-id:outro;ts:${ts};`)}`,
      requestId,
    ),
    false,
  );
  assert.equal(
    gateway.verifyWebhookSignature(rawBody, `ts=${ts},v1=`, requestId),
    false,
  );
});
