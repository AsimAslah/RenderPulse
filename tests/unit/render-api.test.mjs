import assert from "node:assert/strict";
import test from "node:test";
import { createRenderApiClient } from "../../src/services/render-api.mjs";

const context = { teamId: "T123", channelId: "C123", userId: "U123" };

test("authenticates status requests and validates the response", async () => {
  let request;
  const client = createRenderApiClient({ baseUrl: "https://render.example", apiKey: "key", fetchImpl: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ render_id: "R1024", status: "completed", model_format: "GLB", updated_at: "2026-11-16T00:00:00Z" }), { status: 200 });
  } });
  assert.equal((await client.getStatus("R1024", context)).status, "completed");
  assert.equal(request.options.headers.authorization, "Bearer key");
  assert.equal(request.options.headers["x-renderpulse-slack-channel"], "C123");
});

test("maps not found and authorization failures", async () => {
  for (const [status, code] of [[404, "not_found"], [403, "unauthorized"]]) {
    const client = createRenderApiClient({ baseUrl: "https://render.example", apiKey: "key", fetchImpl: async () => new Response("{}", { status }) });
    await assert.rejects(client.getStatus("R1024", context), (error) => error.code === code);
  }
});

test("rejects malformed status data", async () => {
  const client = createRenderApiClient({ baseUrl: "https://render.example", apiKey: "key", fetchImpl: async () => new Response(JSON.stringify({ render_id: "R1024", status: "invented" }), { status: 200 }) });
  await assert.rejects(client.getStatus("R1024", context), (error) => error.code === "malformed_response");
});

test("aborts a timed-out backend request", async () => {
  const client = createRenderApiClient({ baseUrl: "https://render.example", apiKey: "key", timeoutMs: 5, fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  }) });
  await assert.rejects(client.getStatus("R1024", context), (error) => error.code === "timeout");
});

