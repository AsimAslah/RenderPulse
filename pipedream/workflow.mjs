import crypto from "node:crypto";

const replayCache = globalThis.__renderPulseReplayCache ??= new Map();
const STATES = new Set(["queued", "processing", "completed", "failed"]);
const RENDER_ID = /^R[A-Z0-9]{4,31}$/;

function env(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function rawBodyFrom(event) {
  if (typeof event.bodyRaw === "string") return event.bodyRaw;
  if (Buffer.isBuffer(event.bodyRaw)) return event.bodyRaw.toString("utf8");
  if (typeof event.body === "string") return event.body;
  throw new Error("Pipedream did not expose the original raw request body; signature verification cannot continue safely.");
}

function headersFrom(event) {
  const input = event.headers || {};
  const pairs = Array.isArray(input)
    ? Array.from({ length: Math.floor(input.length / 2) }, (_, index) => input.slice(index * 2, index * 2 + 2))
    : Object.entries(input);

  return Object.fromEntries(pairs.map(([key, value]) => [String(key).toLowerCase(), String(value)]));
}

function verifySignature(rawBody, headers, secret) {
  const timestamp = headers["x-slack-request-timestamp"];
  const signature = headers["x-slack-signature"];
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  const expected = `v0=${crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function claim(signature) {
  const now = Date.now();
  for (const [key, expires] of replayCache) if (expires <= now) replayCache.delete(key);
  if (replayCache.has(signature)) return false;
  if (replayCache.size >= 5_000) replayCache.delete(replayCache.keys().next().value);
  replayCache.set(signature, now + 300_000);
  return true;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function slackCall(token, method, payload) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (response.status === 429 && attempt < 2) {
      await wait(Math.min(Number(response.headers.get("retry-after") || 1), 5) * 1_000);
      continue;
    }
    if (response.status >= 500 && attempt < 2) {
      await wait(250 * (attempt + 1));
      continue;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) throw new Error(`Slack API rejected ${method}: ${data.error || response.status}`);
    return data;
  }
  throw new Error("Slack API retry budget exhausted.");
}

function statusMessage(render) {
  const appearance = {
    queued: ["⚪", "Queued", "#94A3B8"],
    processing: ["🟡", "Processing", "#22D3EE"],
    completed: ["🟢", "Completed", "#10B981"],
    failed: ["🔴", "Failed", "#EF4444"],
    not_found: ["⚫", "Not found", "#64748B"],
  }[render.status];
  const lines = [`${appearance[0]} *Status:* ${appearance[1]}`, `*Render ID:* \`${render.render_id}\``];
  if (render.progress !== undefined) lines.push(`*Progress:* ${render.progress}%`);
  if (render.model_format) lines.push(`*Model format:* ${render.model_format}`);
  if (render.status === "failed") lines.push("*Action:* Check the rendering service and retry if appropriate.");
  return {
    text: `RenderPulse — ${render.render_id}: ${appearance[1]}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "RenderPulse — Render Status", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Your 3D renders. One command away." }] },
    ],
    attachments: [{ color: appearance[2], fallback: `RenderPulse — ${render.render_id}: ${appearance[1]}` }],
  };
}

const usageMessage = {
  text: "Usage: /model-status <render_id>",
  blocks: [{ type: "section", text: { type: "mrkdwn", text: "*RenderPulse usage*\n`/model-status <render_id>`\nExample: `/model-status R1024`\nUse `/model-status help` to show this message." } }],
};

async function getRender(baseUrl, apiKey, renderId, command, timeoutMs) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/renders/${encodeURIComponent(renderId)}/status`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
      "x-renderpulse-slack-team": command.team_id,
      "x-renderpulse-slack-channel": command.channel_id,
      "x-renderpulse-slack-user": command.user_id,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return { render_id: renderId, status: "not_found" };
  if (response.status === 401 || response.status === 403) throw new Error("unauthorized");
  if (!response.ok) throw new Error("unavailable");
  const render = await response.json().catch(() => null);
  if (!render || render.render_id !== renderId || !STATES.has(render.status)) throw new Error("malformed_response");
  if (render.progress !== undefined && (!Number.isInteger(render.progress) || render.progress < 0 || render.progress > 100)) throw new Error("malformed_response");
  if (render.model_format !== undefined && (typeof render.model_format !== "string" || !/^[A-Z0-9]{2,12}$/.test(render.model_format))) throw new Error("malformed_response");
  return render;
}

export default defineComponent({
  async run({ steps, $ }) {
    const event = steps.trigger.event;
    const headers = headersFrom(event);
    const rawBody = rawBodyFrom(event);
    const signingSecret = env("SLACK_SIGNING_SECRET");
    if (!verifySignature(rawBody, headers, signingSecret)) {
      await $.respond({ immediate: true, status: 401, body: "Invalid request" });
      return { outcome: "rejected_signature" };
    }

    const command = Object.fromEntries(new URLSearchParams(rawBody));
    const allowedChannels = new Set(env("SLACK_ALLOWED_CHANNEL_IDS").split(",").map((value) => value.trim()).filter(Boolean));
    const validContext = command.command === "/model-status"
      && command.team_id === env("SLACK_TEAM_ID")
      && command.api_app_id === env("SLACK_APP_ID")
      && allowedChannels.has(command.channel_id)
      && /^[A-Z][A-Z0-9]{2,31}$/.test(command.user_id || "");
    if (!validContext) {
      await $.respond({ immediate: true, status: 403, body: "Request not allowed" });
      return { outcome: "rejected_context" };
    }

    await $.respond({ immediate: true, status: 200, body: "" });
    const signature = headers["x-slack-signature"];
    if (!claim(signature)) return { outcome: "duplicate_suppressed" };

    const botToken = env("SLACK_BOT_TOKEN");
    const input = (command.text || "").trim().toUpperCase();
    if (!input || input === "HELP" || !RENDER_ID.test(input)) {
      await slackCall(botToken, "chat.postEphemeral", { channel: command.channel_id, user: command.user_id, ...usageMessage });
      return { outcome: "usage_sent" };
    }

    try {
      const timeoutMs = Number(process.env.RENDER_API_TIMEOUT_MS || 10_000);
      if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error("invalid_timeout_configuration");
      const render = await getRender(env("RENDER_API_BASE_URL"), env("RENDER_API_KEY"), input, command, timeoutMs);
      const method = render.status === "not_found" ? "chat.postEphemeral" : "chat.postMessage";
      const destination = method === "chat.postEphemeral"
        ? { channel: command.channel_id, user: command.user_id }
        : { channel: command.channel_id };
      const digest = crypto.createHash("sha256").update(signature).digest("hex");
      const clientMessageId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
      const idempotency = method === "chat.postMessage" ? { client_msg_id: clientMessageId } : {};
      await slackCall(botToken, method, { ...destination, ...statusMessage(render), ...idempotency });
      return { outcome: "status_sent", render_id: input, status: render.status };
    } catch (error) {
      const text = error?.name === "TimeoutError"
        ? "The render service took too long to respond. Please try again."
        : error?.message === "unauthorized"
          ? "You are not authorized to view that render in this channel."
          : "The render service is temporarily unavailable. Please try again later.";
      await slackCall(botToken, "chat.postEphemeral", { channel: command.channel_id, user: command.user_id, text });
      return { outcome: "private_error_sent" };
    }
  },
});

