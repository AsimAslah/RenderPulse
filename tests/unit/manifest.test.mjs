import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Slack manifest requests exactly the two documented bot scopes", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../slack-manifest.json", import.meta.url), "utf8"));
  assert.deepEqual([...manifest.oauth_config.scopes.bot].sort(), ["chat:write", "commands"]);
  assert.equal(manifest.settings.socket_mode_enabled, false);
  assert.equal(manifest.features.slash_commands[0].command, "/model-status");
});

