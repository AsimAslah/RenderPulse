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

Repository implementation and local automated verification are complete. Submission is not ready until the account owner completes Slack/Pipedream installation, deploys Image-to-3D with the status extension, verifies live raw-body handling and latency, produces the authentic Slack response, and confirms CI on the pull requests.

