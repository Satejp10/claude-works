# Analytics deploy — progress log
Last updated: 2026-08-20

## Status: BLOCKED on deploy (needs Satej's Cloudflare account). Everything else done.

## Done — merged to main (PR #15 claude-works, PR #4 profile)
- Cloudflare Worker + D1 in `claude-works/analytics/`. Endpoints: `POST /hit` (beacon, origin-locked), `GET /badge.svg`, `GET /views.svg`, `GET /stats.json`.
- visit-beacon `<script>` before `</body>` in all 8 `works/` files + bottom of `claude-works/README.md`.
- 2 `<img>` badges on profile README (`Satejp10/Satejp10`), **commented out** (marker `analytics-badge:hidden`) — hidden only because the Worker isn't deployed yet.
- Docs: `analytics/README.md`, `CLAUDE.md`, `docs/sync-log.md`.

## Remaining job (the whole thing): deploy the Worker
Needs Satej's Cloudflare account (free tier is enough). Interactive `wrangler login` won't run in a Claude Code / chat container; the alternative is a scoped `CLOUDFLARE_API_TOKEN` in the environment.

**Recommended path (decided 2026-08-20):** run in **Claude Code web** on the `claude-works` repo with a `CLOUDFLARE_API_TOKEN` set in env — use Cloudflare's **"Edit Cloudflare Workers"** token template (it includes D1). One environment that both deploys non-interactively AND pushes the badge un-hide + host-fix. Local fallback: same commands, browser for `wrangler login` or the same token to skip it.

Deploy commands:
```
cd analytics
npx wrangler login                       # skip if CLOUDFLARE_API_TOKEN is set
npx wrangler d1 create claude-works-analytics
# paste the printed database_id into wrangler.toml
npx wrangler d1 execute claude-works-analytics --remote --file=./schema.sql
openssl rand -hex 32 | npx wrangler secret put VISITOR_SALT
npx wrangler deploy
```

Then **confirm the deployed hostname**. Default `claude-works-analytics.satejp10.workers.dev` appears in 10 places (8 works, `claude-works/README.md`, 2 badge URLs in profile README). `analytics/README.md` has a sed one-liner if the account subdomain differs.

Then (easy to forget — it's the point): **un-hide the 2 badges** in `Satejp10/Satejp10` README — remove the comment wrappers at the two `analytics-badge:hidden` markers.

Then delete this log + the original handoff — job done.

## NEW this session (2026-08-20) — do during the deploy pass
**Cache headers:** `badge.svg` and `views.svg` set no `Cache-Control`. GitHub Camo caches the fetched SVG, so the profile badge will show **stale numbers**. Return a short or `no-cache` `Cache-Control` on both endpoints so Camo re-fetches and the count stays fresh. (Same Camo caching already blamed for the `/views.svg` undercount, applied here to display.)

## Verify after deploy
- `POST /hit` with no Origin header → expect 403
- `POST /hit` with `Origin: https://satejp10.github.io` → expect 204
- open `satejp10.github.io/claude-works/`, then: `wrangler d1 execute claude-works-analytics --remote --command "SELECT * FROM pageviews"`
- load `github.com/Satejp10`, confirm both badges render as images

## Constraints — DO NOT UNDO
- Camo strips visitor IP/UA and caches, and README markdown is sanitised (no JS runs). Region/device **cannot** be measured on a profile README. Demographics are **collected** on the Pages site (real browser), only **displayed** on the profile. `/views.svg` counts Camo fetches — undercounts, no demographics. Honest ceiling.
- Privacy: no IP ever written. Country/continent from `request.cf`. Unique visitors = one-way SHA-256 of ip + ua + salt + UTC day, rotated nightly, deleted next day. No cookies / localStorage / cross-day / cross-site id.
- **Trap 1:** never widen `ALLOWED_ORIGINS` to `"*"` — the origin lock stops the thumbnail CI (headless Chromium from `localhost:8731`) from polluting the data (those beacon hits get 403'd).
- **Trap 2:** the `<script>` at the bottom of `claude-works/README.md` instruments the gallery **landing page** (Pages renders it from that markdown). GitHub.com strips `<script>` so it looks like a stray tag — do not delete it.

## Verification already done (don't redo unless the Worker changes)
20 checks vs a stubbed D1 (origin rejection, view/visitor counting, dedupe, device inference, missing `request.cf`, both badges, empty state). Badges rendered in headless Chromium for layout. Post-merge thumbnail workflow ran green; profile mirror correctly left the badges alone (they sit outside the SELECTED-WORK markers).
