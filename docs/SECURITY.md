# Security model

## Controls

- Original raw-body Slack HMAC-SHA256 verification with `timingSafeEqual`
- Five-minute timestamp replay window
- Exact workspace, application, command, user-ID, and channel checks
- Strict `R`-prefixed render-ID allowlist
- Process-local five-minute duplicate-signature cache with a fixed maximum size
- Deterministic Slack `client_msg_id` for cross-worker channel-message idempotency
- HTTPS backend request with bearer authentication, Slack context headers, and timeout
- Backend authorization for the configured workspace and controlled channels
- Response schema and state allowlists; no model URLs pass through RenderPulse
- Sanitized user messages and no raw payload or credential logging
- Bounded retry only for Slack 429/5xx/network failures

## Secrets

Use Pipedream project secrets and the Image-to-3D deployment secret manager. Rotate a value immediately if it appears in logs, screenshots, chat, Git history, or a support ticket. The repository contains placeholders only.

Recommended generation:

```bash
openssl rand -hex 32
```

Use a different value for Slack's signing secret and `RENDER_API_KEY`. Do not log `response_url`, bot tokens, bearer keys, raw request bodies, or private asset URLs.

## Authorization limitations

The current Image-to-3D application has no user accounts or per-render ownership. The compatible extension therefore authorizes status by backend key, Slack workspace, and an explicit controlled-channel allowlist. If per-user ownership is added later, the status endpoint must enforce it before broadening channel access.

## Duplicate protection

The provided warm-process cache prevents duplicate delivery within one Pipedream worker, while successful channel posts also use a deterministic `client_msg_id` derived from the verified signature. A multi-worker or high-volume deployment should still use a Pipedream Data Store or another shared TTL store to avoid duplicated backend work and ephemeral errors.

## Reporting

Report vulnerabilities privately to the repository owner. Do not open a public issue containing credentials, private URLs, payloads, or exploit details.

