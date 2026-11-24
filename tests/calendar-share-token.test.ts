import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";

const TEST_SECRET = "segredo-de-teste-do-calendario-123456";

process.env.CALENDAR_SHARE_SECRET = TEST_SECRET;

const { generateShareToken, verifyShareToken, SHARE_TOKEN_TTL_MS } = await import(
  "../src/shared/tokens/calendarShareToken"
);

const params = { scheduleType: "6x1", referenceDate: "2026-08-20" };

test("token válido devolve os parâmetros assinados", () => {
  const token = generateShareToken(params);
  assert.ok(token);

  assert.deepEqual(verifyShareToken(token!), params);
});

test("token adulterado é rejeitado", () => {
  const token = generateShareToken(params)!;
  const signature = token.slice(token.lastIndexOf(".") + 1);
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      s: "3x3",
      r: "2026-08-20",
      e: Date.now() + SHARE_TOKEN_TTL_MS,
      n: "adulterado",
    }),
  ).toString("base64url");

  const lastChar = signature.slice(-1);
  const flippedSignature = `${signature.slice(0, -1)}${lastChar === "0" ? "1" : "0"}`;

  assert.equal(verifyShareToken(`${tamperedPayload}.${signature}`), null);
  assert.equal(verifyShareToken(`${token.slice(0, -1 - signature.length)}${flippedSignature}`), null);
});

test("token expirado é rejeitado", () => {
  const now = 1_800_000_000_000;
  const token = generateShareToken(params, now)!;

  assert.ok(verifyShareToken(token, now + 1000));
  assert.equal(verifyShareToken(token, now + SHARE_TOKEN_TTL_MS + 1), null);
});

test("token ausente, malformado ou com validade longa é rejeitado", () => {
  assert.equal(verifyShareToken(""), null);
  assert.equal(verifyShareToken("sem-assinatura"), null);
  assert.equal(verifyShareToken("a.b"), null);
  assert.equal(verifyShareToken(`${"x".repeat(3000)}.assinatura`), null);
});

test("token assinado com validade longa (versão antiga de 7 dias) é rejeitado", () => {
  const now = Date.now();
  const serialized = JSON.stringify({
    s: "6x1",
    r: "2026-08-20",
    e: now + 7 * 24 * 60 * 60 * 1000,
    n: "legado",
  });
  const signedLongToken = `${Buffer.from(serialized).toString("base64url")}.${createHmac(
    "sha256",
    TEST_SECRET,
  )
    .update(serialized)
    .digest("hex")}`;

  assert.equal(verifyShareToken(signedLongToken, now), null);
});

test("a validade do link compartilhado é curta", () => {
  assert.ok(SHARE_TOKEN_TTL_MS <= 24 * 60 * 60 * 1000);
});
