import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createSlashCommandHandler } from "../../src/slash-command.mjs";

const nowMs = 1_700_000_000_000;
const timestamp = String(nowMs / 1000);
const config = { slackSigningSecret: "secret", teamId: "T123", appId: "A123", allowedChannelIds: new Set(["C123"]) };

function request(text = "R1024") {
  const rawBody = new URLSearchParams({ command: "/model-status", text, team_id: "T123", api_app_id: "A123", channel_id: "C123", user_id: "U123" }).toString();
  const signature = `v0=${createHmac("sha256", config.slackSigningSecret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  return { rawBody, headers: { "x-slack-request-timestamp": timestamp, "x-slack-signature": signature }, signature };
}

test("acknowledges before starting the asynchronous backend lookup", async () => {
  const order = [];
  const handler = createSlashCommandHandler({ config, now: () => nowMs, renderClient: { getStatus: async () => {
    order.push("lookup");
    return { render_id: "R1024", status: "completed", model_format: "GLB" };
  } }, slackClient: { postMessage: async (_channel, message) => {
    assert.match(message.client_msg_id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    order.push("post");
  }, postEphemeral: async () => order.push("ephemeral") } });
  await handler({ ...request(), acknowledge: async () => order.push("ack") });
  assert.deepEqual(order, ["ack", "lookup", "post"]);
});

test("keeps usage errors private", async () => {
  const calls = [];
  const handler = createSlashCommandHandler({ config, now: () => nowMs, renderClient: { getStatus: async () => assert.fail("should not call backend") }, slackClient: { postMessage: async () => assert.fail("should not post publicly"), postEphemeral: async (...args) => calls.push(args) } });
  await handler({ ...request("bad/id"), acknowledge: async () => {} });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "C123");
  assert.equal(calls[0][1], "U123");
});

test("rejects invalid signatures without acknowledging", async () => {
  let acknowledged = false;
  const handler = createSlashCommandHandler({ config, now: () => nowMs, renderClient: {}, slackClient: {} });
  const input = request();
  input.headers["x-slack-signature"] = "v0=invalid";
  const response = await handler({ ...input, acknowledge: async () => { acknowledged = true; } });
  assert.equal(response.status, 401);
  assert.equal(acknowledged, false);
});

test("suppresses duplicate signed deliveries", async () => {
  let lookups = 0;
  const handler = createSlashCommandHandler({ config, now: () => nowMs, renderClient: { getStatus: async () => { lookups += 1; return { render_id: "R1024", status: "queued" }; } }, slackClient: { postMessage: async () => {}, postEphemeral: async () => {} } });
  await handler({ ...request(), acknowledge: async () => {} });
  const second = await handler({ ...request(), acknowledge: async () => {} });
  assert.equal(second.duplicate, true);
  assert.equal(lookups, 1);
});

