function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function readConfig(env = process.env) {
  const timeoutMs = Number(env.RENDER_API_TIMEOUT_MS ?? 10_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw new Error("RENDER_API_TIMEOUT_MS must be an integer from 100 to 30000.");
  }
  const channels = required(env, "SLACK_ALLOWED_CHANNEL_IDS")
    .split(",").map((item) => item.trim()).filter(Boolean);
  if (channels.length === 0) throw new Error("At least one allowed channel is required.");

  return Object.freeze({
    slackBotToken: required(env, "SLACK_BOT_TOKEN"),
    slackSigningSecret: required(env, "SLACK_SIGNING_SECRET"),
    teamId: required(env, "SLACK_TEAM_ID"),
    appId: required(env, "SLACK_APP_ID"),
    allowedChannelIds: new Set(channels),
    renderApiBaseUrl: required(env, "RENDER_API_BASE_URL").replace(/\/$/, ""),
    renderApiKey: required(env, "RENDER_API_KEY"),
    renderApiTimeoutMs: timeoutMs,
  });
}

