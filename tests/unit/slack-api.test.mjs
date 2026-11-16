import assert from "node:assert/strict";
import test from "node:test";
import { createSlackClient } from "../../src/services/slack-api.mjs";

test("checks Slack's JSON-level ok response", async () => {
  const client = createSlackClient({ token: "xoxb-test", maxRetries: 0, fetchImpl: async () => new Response(JSON.stringify({ ok: false, error: "missing_scope" }), { status: 200 }) });
  await assert.rejects(client.postMessage("C123", { text: "hello" }), (error) => error.code === "missing_scope");
});

test("honors Retry-After for a bounded rate-limit retry", async () => {
  let calls = 0;
  const sleeps = [];
  const client = createSlackClient({ token: "xoxb-test", maxRetries: 1, sleep: async (ms) => sleeps.push(ms), fetchImpl: async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ ok: false, error: "ratelimited" }), { status: 429, headers: { "retry-after": "2" } });
    return new Response(JSON.stringify({ ok: true, ts: "1.2" }), { status: 200 });
  } });
  await client.postMessage("C123", { text: "hello" });
  assert.deepEqual(sleeps, [2_000]);
  assert.equal(calls, 2);
});

