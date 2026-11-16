# Slack developer sandbox setup

These steps require the account owner; do not place tokens in screenshots or chat.

1. Visit <https://api.slack.com/developer-program> and join the Slack Developer Program.
2. Complete the email activation and provision a developer sandbox.
3. Use Handshake event code `HANDSHAKE_SLACK1` and select the default workspace data template.
4. Open the sandbox and sign in, then visit <https://api.slack.com/apps>.
5. Create an app from a manifest or from scratch in the sandbox workspace. If importing `slack-manifest.json`, first replace its Request URL placeholder with the deployed Pipedream HTTPS URL.
6. Set the name to **RenderPulse**, description to **Track 3D model generation jobs directly from Slack**, and upload `assets/slack-icon.png`.
7. Under OAuth & Permissions, add only `commands` and `chat:write` as bot scopes.
8. Under Slash Commands, create `/model-status`, set the deployed HTTPS Request URL, description, and `<render_id> or help` usage hint.
9. Do not enable Event Subscriptions, Socket Mode, interactivity, or extra scopes.
10. Install the app to the sandbox. Store the bot token in `SLACK_BOT_TOKEN` and the signing secret in `SLACK_SIGNING_SECRET` using Pipedream secrets.
11. Record the workspace ID, app ID, and controlled channel ID in their matching secrets.
12. Invite RenderPulse to the controlled channel: `/invite @RenderPulse`.

Any OAuth scope change requires reauthorization or reinstalling the app. Capture redacted screenshots only after the live configuration works.

