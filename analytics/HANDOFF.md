# Deploy the analytics Worker

> **Open task.** Everything in `analytics/` is written, tested and merged, but the
> Worker has never been deployed. This file exists only to finish that job —
> **delete it once the Worker is live.**

Until it is deployed, `claude-works-analytics.satejp10.workers.dev` does not
resolve, so the two analytics badges on the `Satejp10/Satejp10` profile README are
**commented out** to stop them rendering as broken images. Deploying is therefore a
two-part job: run the deploy, then un-hide the badges.

---

# 📋 For claude.ai — tap the copy icon, paste into chat

````text
CONTEXT: Finishing visit analytics for Satej's GitHub profile.
Repos: github.com/Satejp10/claude-works and github.com/Satejp10/Satejp10.
State as of 2026-08-20.

THE TASK
Count visits to the GitHub profile, with estimated region and mobile/desktop.

WHAT'S DONE (merged to main in both repos, PRs #15 and #4)
- analytics/ in claude-works: a Cloudflare Worker + D1 database.
  Endpoints: POST /hit (beacon target, origin-locked), GET /badge.svg
  (demographics card), GET /views.svg (approximate profile hit count),
  GET /stats.json.
- A visit-beacon <script> block before </body> in all 8 files in works/,
  and at the bottom of claude-works/README.md.
- Two <img> badges on the profile README (Satejp10/Satejp10). These are
  currently COMMENTED OUT, because the Worker is not deployed and they
  would otherwise show as broken images on a public portfolio page. Look
  for the marker "analytics-badge:hidden" in that README.
- Docs: analytics/README.md (deploy steps), CLAUDE.md, docs/sync-log.md.

WHAT'S LEFT — THIS IS THE WHOLE REMAINING JOB
The Worker is NOT DEPLOYED. Deploying needs Satej's Cloudflare account
(free tier is enough). It cannot be done from a Claude Code container:
wrangler login is an interactive browser OAuth flow. Everything else a
deploy needs does work from there (Node, npm, api.cloudflare.com), so a
scoped CLOUDFLARE_API_TOKEN in the environment is the alternative route.

  cd analytics
  npx wrangler login
  npx wrangler d1 create claude-works-analytics
  # paste the printed database_id into wrangler.toml
  npx wrangler d1 execute claude-works-analytics --remote --file=./schema.sql
  openssl rand -hex 32 | npx wrangler secret put VISITOR_SALT
  npx wrangler deploy

Then confirm the deployed hostname. Everything currently points at
claude-works-analytics.satejp10.workers.dev. If the account subdomain is
different, that host appears in 10 places (8 works, claude-works/README.md,
2 badge URLs in the profile README). analytics/README.md has a sed one-liner.

FINALLY — UN-HIDE THE BADGES. This is easy to forget and the whole point of
the feature. In the Satejp10/Satejp10 README, find the two blocks marked
"analytics-badge:hidden" and remove the comment wrappers. Then delete this
file: the job it describes is done.

VERIFY AFTER DEPLOY
- curl POST /hit with no Origin header -> expect 403
- curl POST /hit with Origin: https://satejp10.github.io -> expect 204
- open satejp10.github.io/claude-works/ in a browser, then check:
  wrangler d1 execute claude-works-analytics --remote \
    --command "SELECT * FROM pageviews"
- load github.com/Satejp10 and confirm both badges render as images

THE CONSTRAINT THAT SHAPED ALL OF THIS — DO NOT TRY TO UNDO IT
GitHub routes every README image through its Camo proxy, which fetches the
image server-side. Anything hit from a README sees Camo's IP and a
github-camo user-agent, never the visitor's, and Camo caches so one fetch
serves many readers. README markdown is also sanitised, so no script runs
there. Region and device therefore CANNOT be measured on a profile README,
by this Worker or by any off-the-shelf badge service. This is deliberate
GitHub privacy engineering, not a gap to route around. So: demographics are
COLLECTED on the Pages site (real browser, real JS) and only DISPLAYED on
the profile. /views.svg counts Camo fetches — it undercounts and has no
demographics. That is the honest ceiling for that number.

PRIVACY MODEL — PRESERVE THIS
No IP is ever written to the database. Country/continent come from
Cloudflare's edge (request.cf). Unique visitors use a one-way SHA-256 of
ip + user-agent + secret salt + UTC day, rotated nightly, deleted next day.
No cookies, no localStorage, no cross-day or cross-site identifier.

TWO TRAPS
1. Never widen ALLOWED_ORIGINS to "*". The origin lock is what stops the
   thumbnail CI from polluting the data — it renders every work in headless
   Chromium from localhost:8731, and those beacon hits get 403'd.
2. The beacon at the bottom of claude-works/README.md is what instruments
   the gallery LANDING PAGE (Pages renders it from that markdown).
   GitHub.com strips <script> so it's invisible on the repo page. It looks
   like a stray script tag in a README — it is not, do not delete it.

VERIFICATION ALREADY DONE (don't redo unless you change the Worker)
20 checks against a stubbed D1 covering origin rejection, view/visitor
counting, dedupe, device inference, missing request.cf, both badges, and the
empty state. Badges rendered in headless Chromium to confirm layout. The
post-merge thumbnail workflow ran green and the profile mirror correctly left
the badges alone (they sit outside the SELECTED-WORK markers).
````

---

## Checklist

- [ ] `npx wrangler login`
- [ ] `npx wrangler d1 create claude-works-analytics` → paste `database_id` into `wrangler.toml`
- [ ] `npx wrangler d1 execute claude-works-analytics --remote --file=./schema.sql`
- [ ] `openssl rand -hex 32 | npx wrangler secret put VISITOR_SALT`
- [ ] `npx wrangler deploy`
- [ ] Hostname matches the 10 references (see the `sed` one-liner in [`README.md`](README.md))
- [ ] `/hit` returns 403 without an `Origin` header, 204 with the allowed one
- [ ] **Un-hide both badges** in the `Satejp10/Satejp10` README (`analytics-badge:hidden`)
- [ ] Update the status line in [`../docs/sync-log.md`](../docs/sync-log.md) to "live"
- [ ] Delete this file
