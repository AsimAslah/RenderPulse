const PRESENTATION = {
  queued: { emoji: "⚪", label: "Queued", color: "#94A3B8" },
  processing: { emoji: "🟡", label: "Processing", color: "#22D3EE" },
  completed: { emoji: "🟢", label: "Completed", color: "#10B981" },
  failed: { emoji: "🔴", label: "Failed", color: "#EF4444" },
  not_found: { emoji: "⚫", label: "Not found", color: "#64748B" },
};

export function formatStatusMessage(render) {
  const view = PRESENTATION[render.status];
  if (!view) throw new TypeError("Unsupported render status.");
  const lines = [`${view.emoji} *Status:* ${view.label}`, `*Render ID:* \`${render.render_id}\``];
  if (render.progress !== undefined) lines.push(`*Progress:* ${render.progress}%`);
  if (render.model_format) lines.push(`*Model format:* ${render.model_format}`);
  if (render.status === "failed") lines.push("*Action:* Check the rendering service and retry if appropriate.");
  const fallback = `RenderPulse — ${render.render_id}: ${view.label}`;
  return {
    text: fallback,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "RenderPulse — Render Status", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Your 3D renders. One command away." }] },
    ],
    attachments: [{ color: view.color, fallback }],
  };
}

export function formatUsageMessage() {
  return {
    text: "Usage: /model-status <render_id>",
    blocks: [{
      type: "section",
      text: { type: "mrkdwn", text: "*RenderPulse usage*\n`/model-status <render_id>`\nExample: `/model-status R1024`\nUse `/model-status help` to show this message." },
    }],
  };
}

export function formatServiceError(code) {
  const text = code === "unauthorized"
    ? "You are not authorized to view that render in this channel."
    : code === "timeout"
      ? "The render service took too long to respond. Please try again."
      : "The render service is temporarily unavailable. Please try again later.";
  return { text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] };
}

