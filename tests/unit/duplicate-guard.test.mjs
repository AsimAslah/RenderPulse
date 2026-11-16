import assert from "node:assert/strict";
import test from "node:test";
import { DuplicateGuard } from "../../src/security/duplicate-guard.mjs";

test("rejects duplicates during the TTL and accepts them after expiry", () => {
  const guard = new DuplicateGuard({ ttlMs: 100 });
  assert.equal(guard.claim("signature", 1_000), true);
  assert.equal(guard.claim("signature", 1_050), false);
  assert.equal(guard.claim("signature", 1_101), true);
});

