import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifySlackRequest } from "../../src/security/slack-signature.mjs";

const secret = "test-signing-secret";
const timestamp = "1700000000";
const rawBody = "command=%2Fmodel-status&text=R1024";
const signature = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;

test("accepts a valid Slack signature", () => {
  assert.deepEqual(verifySlackRequest({ rawBody, timestamp, signature, signingSecret: secret, nowMs: 1700000000000 }), { ok: true });
});

test("rejects tampering and differently sized signatures", () => {
  assert.equal(verifySlackRequest({ rawBody: `${rawBody}X`, timestamp, signature, signingSecret: secret, nowMs: 1700000000000 }).reason, "invalid_signature");
  assert.equal(verifySlackRequest({ rawBody, timestamp, signature: "v0=x", signingSecret: secret, nowMs: 1700000000000 }).reason, "invalid_signature");
});

test("rejects timestamps outside the five-minute replay window", () => {
  assert.equal(verifySlackRequest({ rawBody, timestamp, signature, signingSecret: secret, nowMs: 1700000301000 }).reason, "expired_timestamp");
});

test("requires the original raw body", () => {
  assert.equal(verifySlackRequest({ rawBody: { parsed: true }, timestamp, signature, signingSecret: secret, nowMs: 1700000000000 }).reason, "raw_body_required");
});

