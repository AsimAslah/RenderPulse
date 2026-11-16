import { createHash } from "node:crypto";
import { DuplicateGuard } from "./security/duplicate-guard.mjs";
import { verifySlackRequest } from "./security/slack-signature.mjs";
import { formatServiceError, formatStatusMessage, formatUsageMessage } from "./formatters/status-message.mjs";
import { parseSlashCommand, normalizeRenderId, validateSlackContext } from "./utils/validation.mjs";

export function createSlashCommandHandler({ config, renderClient, slackClient, duplicateGuard = new DuplicateGuard(), now = Date.now }) {
  return async function handle({ rawBody, headers, acknowledge }) {
    const timestamp = headers["x-slack-request-timestamp"] ?? headers.get?.("x-slack-request-timestamp");
    const signature = headers["x-slack-signature"] ?? headers.get?.("x-slack-signature");
    const verified = verifySlackRequest({ rawBody, timestamp, signature, signingSecret: config.slackSigningSecret, nowMs: now() });
    if (!verified.ok) return { status: 401, body: "Invalid request" };

    let command;
    try {
      command = parseSlashCommand(rawBody);
    } catch {
      return { status: 400, body: "Invalid request" };
    }
    const context = validateSlackContext(command, config);
    if (!context.ok) return { status: 403, body: "Request not allowed" };

    await acknowledge({ status: 200, body: "" });
    if (!duplicateGuard.claim(signature, now())) return { status: 200, duplicate: true };

    const input = command.text.trim();
    if (!input || input.toLowerCase() === "help") {
      await slackClient.postEphemeral(command.channel_id, command.user_id, formatUsageMessage());
      return { status: 200 };
    }
    const renderId = normalizeRenderId(input);
    if (!renderId) {
      await slackClient.postEphemeral(command.channel_id, command.user_id, formatUsageMessage());
      return { status: 200 };
    }

    try {
      const render = await renderClient.getStatus(renderId, {
        teamId: command.team_id,
        channelId: command.channel_id,
        userId: command.user_id,
      });
      const digest = createHash("sha256").update(signature).digest("hex");
      const clientMessageId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
      await slackClient.postMessage(command.channel_id, {
        ...formatStatusMessage(render),
        client_msg_id: clientMessageId,
      });
    } catch (error) {
      if (error?.code === "not_found") {
        await slackClient.postEphemeral(command.channel_id, command.user_id, formatStatusMessage({ render_id: renderId, status: "not_found" }));
      } else {
        await slackClient.postEphemeral(command.channel_id, command.user_id, formatServiceError(error?.code));
      }
    }
    return { status: 200 };
  };
}

