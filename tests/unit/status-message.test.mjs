import assert from "node:assert/strict";
import test from "node:test";
import { formatStatusMessage } from "../../src/formatters/status-message.mjs";

for (const status of ["queued", "processing", "completed", "failed", "not_found"]) {
  test(`formats ${status} with an accessible fallback`, () => {
    const message = formatStatusMessage({ render_id: "R1024", status, ...(status === "completed" ? { model_format: "GLB" } : {}) });
    assert.match(message.text, /R1024/);
    assert.ok(message.blocks.some((block) => block.type === "section"));
    assert.doesNotMatch(JSON.stringify(message), /undefined/);
  });
}

test("includes progress only when the API genuinely supplies it", () => {
  assert.doesNotMatch(JSON.stringify(formatStatusMessage({ render_id: "R1024", status: "processing" })), /Progress/);
  assert.match(JSON.stringify(formatStatusMessage({ render_id: "R1024", status: "processing", progress: 65 })), /65%/);
});

