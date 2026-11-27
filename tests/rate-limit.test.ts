import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeRateLimit,
  resetRateLimit,
  tooManyRequestsResponse,
} from "../src/infrastructure/security/rateLimit";

test("bloqueia a chave depois de atingir o limite da janela", () => {
  const key = `test:limit:${Math.random()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(consumeRateLimit(key, 3, 60_000).allowed, true);
  }

  const blocked = consumeRateLimit(key, 3, 60_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds > 0);

  resetRateLimit(key);
  assert.equal(consumeRateLimit(key, 3, 60_000).allowed, true);
});

test("chaves diferentes têm contadores independentes", () => {
  const first = `test:a:${Math.random()}`;
  const second = `test:b:${Math.random()}`;

  assert.equal(consumeRateLimit(first, 1, 60_000).allowed, true);
  assert.equal(consumeRateLimit(first, 1, 60_000).allowed, false);
  assert.equal(consumeRateLimit(second, 1, 60_000).allowed, true);
});

test("a resposta 429 informa Retry-After e não é cacheável", () => {
  const response = tooManyRequestsResponse(
    { allowed: false, remaining: 0, retryAfterSeconds: 42 },
    "Muitas tentativas.",
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "42");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
