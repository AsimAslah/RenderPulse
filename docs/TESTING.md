# Testing

## Automated

Run:

```bash
npm ci
npm run lint
npm test
npm run coverage
```

Latest local result on 17 November 2026 (Node 24.21.0):

- Syntax check: 17 modules passed
- Node test runner: 25 tests passed, 0 failed
- Measured source coverage: 83.48% lines, 71.90% branches, 86.96% functions
- `npm audit`: 0 vulnerabilities (no runtime dependencies)
- Image-to-3D focused status tests: 3 passed, 0 failed

The broader Image-to-3D suite ran 19 tests successfully and had three import errors because the local environment lacked optional heavyweight runtime packages `onnxruntime` and `pxr`. Those errors pre-existed this status layer; the focused test and Python compile checks passed. Install the full Image-to-3D requirements before its release gate.

## Covered cases

Signature validity/tampering/expiry, raw-body enforcement, command parsing, render-ID validation, workspace/app/channel checks, duplicate delivery, all status formats, optional progress, bearer/context headers, 404/403/timeout/malformed backend behavior, Slack JSON errors, rate limits, private usage errors, and acknowledgement ordering.

## Required live checks

1. Install the real app in the developer sandbox and invite it to one controlled channel.
2. Execute `help`, invalid ID, not found, queued/processing/completed/failed, unauthorized channel, backend timeout, and backend unavailable cases.
3. Confirm real statuses are channel posts and sensitive errors are ephemeral.
4. Measure actual acknowledgement latency from Pipedream; do not infer it from unit tests.
5. Confirm `invalid_auth`, `missing_scope`, and `not_in_channel` are observable in sanitized workflow diagnostics.
6. Capture only the authentic redacted evidence listed in `HANDSHAKE_SUBMISSION.md`.

Live Pipedream/Slack end-to-end results are pending account-owner deployment and are deliberately not fabricated here.

