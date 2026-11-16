import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRenderId, parseSlashCommand, validateSlackContext } from "../../src/utils/validation.mjs";

test("normalizes supported public render IDs", () => {
  assert.equal(normalizeRenderId(" r1024 "), "R1024");
  assert.equal(normalizeRenderId("RABC123DEF456"), "RABC123DEF456");
  assert.equal(normalizeRenderId("../../etc/passwd"), null);
  assert.equal(normalizeRenderId("R1"), null);
});

test("parses the allowlisted slash command fields only", () => {
  const command = parseSlashCommand("command=%2Fmodel-status&text=R1024&team_id=T123&api_app_id=A123&channel_id=C123&user_id=U123&token=legacy-secret");
  assert.deepEqual(command, { command: "/model-status", text: "R1024", team_id: "T123", api_app_id: "A123", channel_id: "C123", user_id: "U123" });
  assert.equal("token" in command, false);
});

test("validates workspace, app, user, and controlled channel", () => {
  const config = { teamId: "T123", appId: "A123", allowedChannelIds: new Set(["C123"]) };
  const base = { command: "/model-status", team_id: "T123", api_app_id: "A123", channel_id: "C123", user_id: "U123" };
  assert.deepEqual(validateSlackContext(base, config), { ok: true });
  assert.equal(validateSlackContext({ ...base, channel_id: "C999" }, config).reason, "channel_not_allowed");
  assert.equal(validateSlackContext({ ...base, api_app_id: "A999" }, config).reason, "wrong_application");
});

