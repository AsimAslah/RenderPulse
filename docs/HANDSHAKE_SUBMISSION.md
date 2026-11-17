# Handshake submission

## Project

**RenderPulse — Secure 3D Render Tracking for Slack**

A custom Slack application that retrieves real-time 3D render job status using a slash command, a live webhook, asynchronous API communication, and least-privilege OAuth permissions.

## Evidence checklist

Create these files only from the live application and redact credentials, signatures, response URLs, private model URLs, personal data, and raw payloads:

- `01-app-identity.png`
- `02-oauth-scopes.png`
- `03-slash-command.png`
- `04-deployed-workflow.png`
- `05-slack-success-response.png`
- `06-slack-error-handling.png`
- `07-github-ci.png`

The success response must show a real status lookup in the sandbox, not a fixture. The workflow screenshot should prove the workflow is deployed without revealing its secret URL. Record measured acknowledgement latency separately.

## Readiness

Repository implementation, local automated verification, Slack installation, Pipedream deployment, live raw-body signature acceptance, controlled-channel rejection, backend bearer authentication, and the private help response are complete. Submission is not ready until a real render-status response is captured, acknowledgement latency is measured, the redacted evidence set is produced, and CI passes on the release pull request.

