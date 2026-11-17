# Deployment

## Image-to-3D

Apply the companion changes described in `integrations/image-to-3d/README.md`, deploy the FastAPI app behind HTTPS, and set:

```env
RENDER_STATUS_API_KEY=<random secret>
RENDER_STATUS_ALLOWED_TEAM_ID=T...
RENDER_STATUS_ALLOWED_CHANNEL_IDS=C...
```

Verify `/health`, then test the status endpoint with a real completed ID. Do not paste the bearer value into a shell history or screenshot.

## Pipedream

1. Create a Pipedream project named **RenderPulse**.
2. Create a workflow with an HTTP trigger that accepts new requests.
3. Select the trigger's **Raw request** mode. Slack signature verification cannot use a reserialized object.
4. Configure **Return a custom response from your workflow**.
5. Add a Node.js code step and paste `pipedream/workflow.mjs`.
6. Add all values from `.env.example` as Pipedream project secrets.
7. Send a signed local test and inspect the trigger event. The original URL-encoded body must be a string in `event.body` or `event.bodyRaw`; otherwise stop and use a webhook host that guarantees raw bytes.
8. Deploy the workflow. Saved drafts are not live deployments.
9. Copy the live HTTPS trigger URL into the Slack slash command.

In Pipedream's raw-request event shape, `event.headers` may be a flat alternating array of header names and values instead of an object. The checked-in workflow normalizes both representations before looking up Slack's timestamp and signature headers. Do not replace this with parsed-body verification.

The workflow calls `await $.respond({ immediate: true, status: 200, body: "" })` after authentication/context validation and before backend work. The live account has verified raw-body signature acceptance, controlled-channel rejection, and the private help response. Response latency and real render-state handling still require measured evidence before a stable release.

## Verification

Use a real Slack execution and record the Pipedream trigger receive time, HTTP response time, calculated acknowledgement latency, backend outcome, and Slack message timestamp. Do not record the raw body, signature, response URL, token, API key, or model URL. Acceptance requires acknowledgement under three seconds and a real message in the originating channel.

If Pipedream cannot preserve raw bytes or acknowledge reliably, deploy the same core logic on an HTTPS provider that exposes the original request body and can respond before background work. Keep the same environment and security boundaries.

