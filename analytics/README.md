# Analytics

A single Cloudflare Worker that counts visits to the Pages gallery and renders
the results back into the GitHub profile README as SVG.

## Why it is built this way

GitHub routes every image in a README through its **Camo** proxy, which fetches
the image server-side and serves a cached copy to readers. An endpoint hit from
a README therefore sees Camo's IP address and a `github-camo` user-agent —
never the visitor's. README markdown is also sanitised, so no script runs there.

**Region and device cannot be measured from a GitHub profile README.** Not by
this Worker, not by any of the badge services. What *can* be measured is the
Pages site, where our own JavaScript runs in the visitor's real browser. So:

- **Collection** happens on `satejp10.github.io/claude-works/` (gallery + works).
- **Display** happens on the profile README, via SVG this Worker renders.

`/views.svg` does count profile README hits, but it counts *Camo fetches* — it
undercounts (one fetch is cached and served to many readers) and carries no
demographics. It is a rough gauge, nothing more.

## Privacy

No IP address is ever written to the database. Geography comes from
Cloudflare's edge (`request.cf`), which resolves country and continent before
the Worker runs. Unique visitors are counted with a SHA-256 of
`ip + user-agent + secret salt + UTC day` — one-way, rotated every midnight,
and deleted the next day. No cookies, no `localStorage`, no cross-day or
cross-site identifier.

## Deploy

Requires a Cloudflare account (free tier is sufficient) and `wrangler`.

```bash
cd analytics
npm install -g wrangler     # or: npx wrangler ...
wrangler login
```

**1. Create the database**

```bash
wrangler d1 create claude-works-analytics
```

**2.** Copy the printed `database_id` into `wrangler.toml`, replacing
`REPLACE_WITH_DATABASE_ID`.

**3. Apply the schema**

```bash
wrangler d1 execute claude-works-analytics --remote --file=./schema.sql
```

**4. Set the visitor salt** — any long random string; it never leaves Cloudflare.

```bash
openssl rand -hex 32 | wrangler secret put VISITOR_SALT
```

**5. Deploy**

```bash
wrangler deploy
```

**6.** Confirm the deployed hostname. Wrangler prints it — it will look like
`https://claude-works-analytics.<your-subdomain>.workers.dev`. The beacons and
the profile README badges currently point at:

```
https://claude-works-analytics.satejp10.workers.dev
```

If your account subdomain differs, update that host in **10 places**: the eight
files in `works/`, the beacon at the bottom of the root `README.md`, and the two
badge URLs in the `Satejp10/Satejp10` profile README. From the repo root:

```bash
grep -rl "claude-works-analytics.satejp10.workers.dev" works/ README.md \
  | xargs sed -i 's|claude-works-analytics\.satejp10\.workers\.dev|YOUR-HOST-HERE|g'
```

## Verify

```bash
# should return 403 — the origin check is working
curl -X POST https://claude-works-analytics.satejp10.workers.dev/hit \
     -d '{"s":"test","d":"desktop","r":"direct"}'

# should return 204 and record a row
curl -X POST https://claude-works-analytics.satejp10.workers.dev/hit \
     -H 'Origin: https://satejp10.github.io' \
     -d '{"s":"test","d":"desktop","r":"direct"}'

curl https://claude-works-analytics.satejp10.workers.dev/stats.json
```

Then open a work in a browser and confirm the view lands:

```bash
wrangler d1 execute claude-works-analytics --remote \
  --command "SELECT * FROM pageviews ORDER BY views DESC LIMIT 10"
```

To clear test rows before going live:

```bash
wrangler d1 execute claude-works-analytics --remote \
  --command "DELETE FROM pageviews WHERE slug = 'test'"
```

## Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /hit` | Beacon target. Rejects any origin not in `ALLOWED_ORIGINS`. |
| `GET /badge.svg` | Demographics card — views, unique visitors, device split, top regions. |
| `GET /views.svg` | Approximate profile-view counter. |
| `GET /stats.json` | Aggregates as JSON, including per-work and 30-day series. |

## Useful queries

```bash
# which works actually get opened
wrangler d1 execute claude-works-analytics --remote \
  --command "SELECT slug, SUM(views) v, SUM(visitors) u FROM pageviews GROUP BY slug ORDER BY v DESC"

# who arrives from the GitHub profile
wrangler d1 execute claude-works-analytics --remote \
  --command "SELECT referrer, SUM(views) v FROM pageviews GROUP BY referrer ORDER BY v DESC"

# region by device
wrangler d1 execute claude-works-analytics --remote \
  --command "SELECT country, device, SUM(views) v FROM pageviews GROUP BY country, device ORDER BY v DESC LIMIT 20"
```

## Why CI renders don't pollute the numbers

`thumbnails.yml` opens every work in headless Chromium to render thumbnails, so
the beacon fires on each one. Those renders are served from `localhost:8731`,
which is not in `ALLOWED_ORIGINS`, so `/hit` rejects them with a 403 and nothing
is recorded. The origin lock is what makes this safe — if you ever widen it,
widen it to specific hosts, never to `*`.

## Free-tier headroom

D1's free tier allows 100k writes/day. Each pageview costs two writes, so this
supports roughly 50k views/day — far beyond what a portfolio needs.

## Cost of stopping

Delete the Worker and the badges in the profile README turn into broken images.
Remove the two `<img>` tags there and the beacon blocks from `works/` and
`README.md` at the same time.
