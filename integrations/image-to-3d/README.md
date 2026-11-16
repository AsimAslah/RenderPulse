# Image-to-3D integration

Inspection of `AsimAslah/Image-to-3D` found a synchronous FastAPI route that assigns UUID conversion IDs, writes assets under `web-Brickrat/generated`, and optionally saves products to Supabase. It had no job status table or API.

The companion feature branch adds a minimal compatible layer:

- atomic `render-status.json` records beside existing generated assets
- real queued → processing → completed/failed transitions
- a public `R`-prefixed alias instead of the internal UUID
- an authenticated `GET /api/renders/{render_id}/status` endpoint
- independent workspace/channel authorization
- no model URLs, product data, or artificial progress

The extension does not add a database or change existing model, preview, AR, Supabase, or download routes. Image-to-3D issue [#9](https://github.com/AsimAslah/Image-to-3D/issues/9) tracks the work.

Backend variables:

```env
RENDER_STATUS_API_KEY=replace-with-a-long-random-secret
RENDER_STATUS_ALLOWED_TEAM_ID=T_REPLACE_ME
RENDER_STATUS_ALLOWED_CHANNEL_IDS=C_REPLACE_ME
```

The current conversion endpoint is synchronous. A future asynchronous submission API can expose the ID before processing begins, but it must reuse this contract and preserve real states.

