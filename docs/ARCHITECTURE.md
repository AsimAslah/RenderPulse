# Architecture

## Boundaries

RenderPulse is an orchestration layer, not a render database. Slack authenticates the user-facing request; Pipedream verifies it and calls Image-to-3D; Image-to-3D remains authoritative for render state. The Slack app never receives or posts model URLs.

The Image-to-3D extension stores a small `render-status.json` next to each generated conversion. This reuses the existing generated-assets lifecycle instead of adding a second database. Public IDs are stable `R`-prefixed aliases derived from internal conversion UUIDs; the UUID is never returned by the status API.

## Request flow

1. Verify the HMAC over `v0:{timestamp}:{original-body}` with a constant-time comparison.
2. Reject requests more than five minutes old.
3. Validate the exact command, workspace, app, controlled channel, and Slack user ID.
4. Send the HTTP acknowledgement before any render or Slack API request.
5. Suppress a duplicate signed delivery.
6. Validate the render ID and query Image-to-3D with a bearer key and Slack context headers.
7. Validate the response allowlist and post either a public status or private error.

## Status contract

`GET /api/renders/{render_id}/status`

```json
{
  "render_id": "R12345678ABCD",
  "status": "completed",
  "model_format": "GLB",
  "updated_at": "2026-11-17T00:00:00Z"
}
```

`progress` is optional and must be an integer from 0 to 100. The bundled backend extension omits it because the current TripoSR pipeline does not expose measured progress.

## Decisions

- Pipedream is the requested public HTTPS boundary. The workflow fails closed if raw bytes are unavailable.
- `chat.postMessage` is used only for successful real statuses; sensitive errors use `chat.postEphemeral`.
- Controlled-channel authorization is enforced independently in both the webhook and backend.
- No `response_url` is stored or used, reducing secret-bearing URL exposure.

