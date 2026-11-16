const RENDER_ID = /^R[A-Z0-9]{4,31}$/;
const SLACK_ID = /^[A-Z][A-Z0-9]{2,31}$/;

export function normalizeRenderId(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return RENDER_ID.test(normalized) ? normalized : null;
}

export function parseSlashCommand(rawBody) {
  if (typeof rawBody !== "string" && !Buffer.isBuffer(rawBody)) {
    throw new TypeError("The original URL-encoded request body is required.");
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  if (Buffer.byteLength(body, "utf8") > 16 * 1024) {
    throw new RangeError("Request body is too large.");
  }
  const values = new URLSearchParams(body);
  return Object.fromEntries([
    "command", "text", "team_id", "api_app_id", "channel_id", "user_id",
  ].map((key) => [key, values.get(key) ?? ""]));
}

export function validateSlackContext(command, config) {
  if (command.command !== "/model-status") return { ok: false, reason: "wrong_command" };
  if (!SLACK_ID.test(command.team_id) || command.team_id !== config.teamId) {
    return { ok: false, reason: "wrong_workspace" };
  }
  if (!SLACK_ID.test(command.api_app_id) || command.api_app_id !== config.appId) {
    return { ok: false, reason: "wrong_application" };
  }
  if (!SLACK_ID.test(command.channel_id) || !config.allowedChannelIds.has(command.channel_id)) {
    return { ok: false, reason: "channel_not_allowed" };
  }
  if (!SLACK_ID.test(command.user_id)) return { ok: false, reason: "invalid_user" };
  return { ok: true };
}

