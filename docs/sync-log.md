# claude-works → satejp10 profile mirror — setup & change log

_Last updated: 2026-08-20 — the sync is **live**; setup in §3 is done, not pending.
Analytics (§10) is committed but **not yet deployed** — it needs one `wrangler` run.
The profile badges are hidden until it is (§11); `analytics/HANDOFF.md` is the checklist._

---

# 📋 For claude.ai — tap the copy icon, paste into chat

Everything below in the grey box is a self-contained catch-up for a Claude with no
memory of this repo. It is **rewritten in place** whenever something changes, so it
is always current — you never need to paste more than this one block.

````text
CONTEXT: Satej's claude-works repo (github.com/Satejp10/claude-works).
Current as of 2026-07-30.

WHAT IT IS
A publishing space for visual work made with Claude — infographics, dashboards,
design experiments. Each work is one self-contained HTML file (inline CSS/JS,
Google Fonts CDN only, no libraries) in works/. Served live via GitHub Pages at
satejp10.github.io/claude-works/. No build, no tests, no linter.

HOW IT'S WIRED
- The Works table in README.md is the single source of truth.
- A GitHub Action renders a thumbnail for each work and rebuilds the gallery.
- The gallery is then mirrored automatically into the Satejp10/Satejp10 profile
  README's "Selected work" section. Both are generated — never hand-edit them.
- analytics/ holds a Cloudflare Worker + D1 that counts visits to the Pages site
  and renders the numbers back onto the profile README as SVG.

STATUS: the mirror is live and verified (2026-07-29). Analytics is committed but
NOT DEPLOYED — it needs one wrangler run against Satej's Cloudflare account. The
two profile badges are commented out until then, so nothing renders as a broken
image. The checklist for finishing it is analytics/HANDOFF.md.

HOW SATEJ WORKS
He builds in Claude Design (claude.ai), then uploads the file straight to GitHub
via the web UI. Those uploads land at the REPO ROOT, not in works/. That's normal
and expected, not a mistake — a new root file just means "this is a new work,
please file it properly": move it into works/, add a Works-table row, add a bullet
to works/README.md, and copy the visit-beacon block in before </body>.

THREE GOTCHAS
1. Adding an EXTERNAL work (one hosted in its own repo, listed via a hand-made
   thumbnail) does NOT trigger the workflow, because it only touches README.md and
   assets/. It has to be triggered manually.
2. GitHub Pages does not redirect renamed paths. Renaming a folder breaks every
   live URL pointing at the old one. This already happened once: works/ used to be
   called claude-design-works/, which broke 7 links on the profile before the
   mirror repaired them.
3. GitHub proxies README images through its Camo service, so region and device
   CANNOT be measured on the profile README — the origin only ever sees Camo's IP
   and a github-camo user-agent. Demographics are collected on the Pages site,
   where real JS runs, and only displayed on the profile.

CURRENT CONTENTS: 10 works — 8 local, plus 2 hosted in their own repos
(EDGE, Plot Light Study).
````

---

This log documents the automation that keeps the **satejp10 profile README's
"Selected work" section** in sync with the **claude-works gallery**, plus the
external-project pattern used to list sites that live in other repos.

**Maintaining this file:** rewrite the copy-block above so it reflects reality;
append to the history below. See "Keeping this log current" in `CLAUDE.md`.

---

## 1. What was built & why

**Problem.** The profile README (`Satejp10/Satejp10`) has a `## Selected work`
table that duplicates the claude-works gallery. It was copied by hand and went
stale whenever the gallery changed.

**Solution (chosen: auto-push from works).** After the claude-works thumbnail
workflow rebuilds the gallery, it now transforms that block and pushes it into
the profile README automatically. The gallery (driven by the Works table in
`claude-works/README.md`) is the single source of truth.

**The only transform:** thumbnail `<img src>` paths are rewritten from
repo-relative (`assets/thumbnails/…`) to absolute
(`https://raw.githubusercontent.com/Satejp10/claude-works/main/assets/thumbnails/…`)
because relative image paths don't resolve when embedded from another repo.
Links, titles, and layout are copied verbatim, so the two stay identical.

---

## 2. Files & changes

### `claude-works` repo

| File | Change |
|---|---|
| `.github/scripts/sync-landing.mjs` | **New.** Reads the generated gallery block (between `<!-- GALLERY:START/END -->`), rewrites thumbnail `src` to absolute raw URLs, and swaps it into the target README between `<!-- SELECTED-WORK:START/END -->`. Skips silently if the target has no markers; idempotent. Run: `node .github/scripts/sync-landing.mjs <landing README path>` |
| `.github/workflows/thumbnails.yml` | **Extended.** After the existing gallery regen + commit, three new steps: (1) check for the `LANDING_SYNC_TOKEN` secret, (2) if present, `actions/checkout` of `Satejp10/Satejp10` into `_landing/` using that token, (3) run `sync-landing.mjs` and commit+push the profile if the block changed. No token → steps no-op (CI stays green). |
| `.gitignore` | Added `_landing/` (the profile checkout the workflow uses). |
| `README.md` | (This session) Added external work **Plot Light Study** + a `<!-- LOG -->` comment documenting the external-repo pattern. |

### `Satejp10/Satejp10` (profile) repo

| File | Change |
|---|---|
| `README.md` | Wrapped the `## Selected work` table in `<!-- SELECTED-WORK:START -->` / `<!-- SELECTED-WORK:END -->` markers. Invisible when rendered; tells the automation which block to replace. Everything outside the markers (bio, badges, tool icons, skills) is never touched. |

### The added workflow steps (reference)

```yaml
      - name: Check for landing sync token
        id: landing
        env:
          LANDING_SYNC_TOKEN: ${{ secrets.LANDING_SYNC_TOKEN }}
        run: |
          if [ -n "$LANDING_SYNC_TOKEN" ]; then
            echo "enabled=true" >> "$GITHUB_OUTPUT"
          else
            echo "enabled=false" >> "$GITHUB_OUTPUT"
            echo "LANDING_SYNC_TOKEN not set — skipping profile sync."
          fi

      - name: Checkout landing profile repo
        if: steps.landing.outputs.enabled == 'true'
        uses: actions/checkout@v4
        with:
          repository: Satejp10/Satejp10
          token: ${{ secrets.LANDING_SYNC_TOKEN }}
          path: _landing

      - name: Mirror gallery into landing profile
        if: steps.landing.outputs.enabled == 'true'
        run: |
          node .github/scripts/sync-landing.mjs _landing/README.md
          cd _landing
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add README.md
          if git diff --cached --quiet; then
            echo "Profile Selected work already up to date."
          else
            git commit -m "chore: mirror Selected work from claude-works gallery"
            git push
          fi
```

---

## 3. One-time setup — ✅ DONE (2026-07-29)

**This is already configured. Nothing to do here.** Recorded for reference only:

1. A **fine-grained Personal Access Token** was created:
   - Repository access: **only `Satejp10/Satejp10`**
   - Permissions: **Contents → Read and write**
2. It is stored in the **claude-works** repo as an Actions secret named
   **`LANDING_SYNC_TOKEN`** (Settings → Secrets and variables → Actions). Note the
   secret lives on claude-works — the repo doing the pushing — not on the profile repo.

If the secret is ever missing or expired, the sync behaves differently in each case:
without it the sync steps **skip** and CI stays green (the profile just goes stale);
with an **expired** token the `Checkout landing profile repo` step **fails** and CI goes
red — that red build is the renewal signal.

---

## 4. How the sync triggers

| Change type | Auto-triggers workflow? | How the profile updates |
|---|---|---|
| **Local HTML work** (file under `works/**`) | **Yes** — matches the workflow `paths:` filter. | Fully automatic: push to `main` → render → rebuild gallery → sync to profile. |
| **External work** (another repo; only `README.md` + `assets/` change) | **No** — `paths:` filter excludes README/assets by design (CI-loop avoidance). | Rebuild the gallery locally, then **run the workflow manually** (Actions → *Generate work thumbnails* → **Run workflow**) to fire the sync. |

The manual **Run workflow** button also works as a "sync now" for any state.

---

## 5. Adding an EXTERNAL work (site hosted in another repo)

Follow the EDGE / Plot Light Study pattern:

1. **Capture a thumbnail** of the live site at 1200×750 (top fold) and commit it
   to `assets/thumbnails/<name>.png`. (External works are **not** auto-rendered.)
   - Note: in this environment, headless Chromium can't reach the public
     internet through the egress proxy, but self-contained pages can be fetched
     with `curl` and rendered from a local static server (localhost bypasses the
     proxy). That's how the Plot Light Study snapshot was made.
2. **Add a Works-table row** with `[View](live URL)`, `[Source](repo URL)`, and
   `[Thumb](assets/thumbnails/<name>.png)`; note "Lives in its own repo" in the
   description.
3. **Do NOT** add it to `works/README.md` (there's no local file).
4. **Rebuild the gallery:** `SKIP_RENDER=1 node .github/scripts/gen-thumbnails.mjs`
5. Commit `README.md` + the thumbnail. To mirror to the profile, run the
   workflow manually (see §4).

---

## 6. Local verification recipe

```bash
# rebuild gallery from the table (no rendering / no Playwright)
SKIP_RENDER=1 node .github/scripts/gen-thumbnails.mjs

# dry-run the profile sync against a local clone of Satejp10/Satejp10
node .github/scripts/sync-landing.mjs /path/to/Satejp10-clone/README.md
git -C /path/to/Satejp10-clone diff README.md   # inspect what would be pushed
```

---

## 7. Suggested CLAUDE.md additions (for claude.ai)

Consider adding a short section to `claude-works/CLAUDE.md`:

> **Profile mirror.** The gallery is mirrored to the `Satejp10/Satejp10` profile
> README's `Selected work` section by `.github/scripts/sync-landing.mjs`, run as
> the final steps of `thumbnails.yml` (gated on the `LANDING_SYNC_TOKEN` secret).
> It replaces only the block between `<!-- SELECTED-WORK:START/END -->` markers in
> the profile README and rewrites thumbnail `src` paths to absolute raw URLs.
> Local works auto-sync on push; **external works only touch README/assets, so
> they don't trigger the workflow — run it manually to sync them.**

---

## 8. PRs in this effort

- `Satejp10/Satejp10#2` — add `SELECTED-WORK` markers. **Merged.**
- `Satejp10/claude-works#8` — sync automation (script + workflow). **Merged.**
- `Satejp10/claude-works#9` — add external work "Plot Light Study". **Merged.**
- `Satejp10/claude-works#10` — document the external-work pattern + profile mirror in CLAUDE.md. **Merged.**
- `Satejp10/claude-works#11` — CLAUDE.md rewrite via `/init`. **Merged.**
- `Satejp10/claude-works#12` — rename `claude-design-works/` → `works/`; index Koyna; publish newer AI accelerators revision. **Merged.**

## 8b. Repo changes since the original write-up (2026-07-29)

- **`claude-design-works/` → `works/`.** The repo name stayed `claude-works` —
  renaming the repo would have changed every live Pages URL. 39 references, 3 of
  them functional (two in `gen-thumbnails.mjs`, one `paths:` filter in the workflow).
  **This rename broke 7 profile links**, which the mirror then repaired (§9).
- **Three files uploaded to the repo root were triaged.** "Add files via upload"
  commits land at the root, not in `works/`:
  - `koyna-monsoon-dashboard.html` → moved into `works/` and indexed.
  - `ai-accelerators-2026.html` → was a **newer revision** than the published copy
    (15 accelerators vs 14, adds OpenAI "Jalapeño"). The gallery had been serving
    the older page; the newer one was promoted.
  - `llm_cheatsheet_website.jsx` → **left at the root on purpose.** It's a React
    component (imports `react`, `lucide-react`), so it can't be served as a static
    page. See CLAUDE.md § "Unindexed files at the repo root".

## 9. End-to-end test results

### Gate test — 2026-07-12 (run #7, `actions/runs/29189565487`) → success

Manually dispatched after #9 merged. Render + gallery-rebuild ran; the two sync
steps (`Checkout landing profile repo`, `Mirror gallery into landing profile`)
correctly reported **`skipped`** because `LANDING_SYNC_TOKEN` was not yet set.
This validated the token gate: no secret, no failure.

### Live test — 2026-07-29 (run #9, `actions/runs/30445468205`) → success, 82s

First run with the token in place. The sync steps executed and pushed commit
`1eed0cd` ("chore: mirror Selected work from claude-works gallery") to
`Satejp10/Satejp10`. Verified against the live profile rather than the run log:

- **7 dead `claude-design-works/…` links → 0.** All 10 links in `Selected work`
  return HTTP 200. (Those links broke when `claude-design-works/` was renamed to
  `works/` — GitHub Pages does not redirect renamed paths.)
- **Plot Light Study** and **Koyna Dam** reached the profile — both had been
  waiting on the token since 12 July.
- Diff was 11 insertions / 7 deletions, **entirely inside the marker block**.
  Nothing else in the profile README was touched.

The mirror is therefore confirmed working end to end, including its blast radius.

---

## 10. Visit analytics — 2026-07-30

Added `analytics/`: a Cloudflare Worker backed by D1 that counts visits to the
Pages gallery and renders the result back onto the profile README as SVG.

### The constraint that shaped it

The original ask was a visit counter on `github.com/Satejp10` with estimated
region and mobile/desktop. **Half of that is impossible, and it is worth writing
down why so nobody tries again.**

GitHub routes every image in a README through its **Camo** proxy, which fetches
the image server-side and serves a cached copy to readers. An endpoint hit from a
README therefore sees Camo's IP address and a `github-camo` user-agent — never
the visitor's. Camo also caches, so one fetch serves many readers. README
markdown is separately sanitised, so no `<script>` runs there either.

Consequence: **region and device cannot be measured on a profile README** — not
by this Worker, not by any of the off-the-shelf badge services, which are all
counting Camo fetches and know nothing about who visited. This is deliberate
privacy engineering on GitHub's part, not a gap to route around.

So the design splits collection from display:

- **Collected** on `satejp10.github.io/claude-works/`, where our own JS runs in
  the visitor's real browser.
- **Displayed** on the profile README, as SVG rendered by the Worker.

### What was built

- `analytics/src/index.js` — Worker with four endpoints: `POST /hit` (beacon
  target, origin-locked), `GET /badge.svg` (demographics card), `GET /views.svg`
  (approximate profile hit count), `GET /stats.json`.
- `analytics/schema.sql` — D1 schema. Aggregate rows keyed by
  (day, slug, country, continent, device, referrer).
- A `<!-- visit-beacon -->` block before `</body>` in all eight files in
  `works/`, and at the bottom of the root `README.md`.

The beacon in the root `README.md` is what instruments the **gallery landing
page** — Pages renders that page from the markdown, and raw HTML passes through,
while GitHub.com strips `<script>` when rendering the repo page. So it is live on
Pages and invisible on GitHub. It sits after the gallery block and does not
affect `parseWorks` (verified: `SKIP_RENDER=1` still parses 10 works).

### Privacy posture

No IP is ever written to the database. Geography comes from Cloudflare's edge
(`request.cf`), which resolves country and continent before the Worker runs.
Unique visitors are counted with a SHA-256 of `ip + user-agent + secret salt +
UTC day` — one-way, rotated at midnight, deleted the next day. No cookies, no
`localStorage`, no cross-day or cross-site identifier.

### Verification

The Worker was exercised against a stubbed D1 before commit — 20 checks covering
origin rejection, view/visitor counting, dedupe, device inference, the
missing-`request.cf` fallback, both badges, and the empty state. Badges were
rendered in headless Chromium to confirm layout; this caught a text collision
between the "unique visitors" line and the "TOP REGIONS" heading, and an empty
state that drew the device bar fully in the mobile colour. Both fixed.

**Not yet deployed.** The Worker needs one `wrangler` run against Satej's
Cloudflare account (create D1, apply schema, set `VISITOR_SALT`, deploy) — see
`analytics/README.md`. Until that happens the two badge images on the profile
README are broken links. If the deployed hostname differs from
`claude-works-analytics.satejp10.workers.dev`, it has to be updated in 10 places;
`analytics/README.md` has the `sed` one-liner.

> Superseded in part by §11: the badges are no longer broken links, they are
> commented out.

---

## 11. Badges hidden pending deploy — 2026-08-20

The Worker still is not deployed — `claude-works-analytics.satejp10.workers.dev`
has no DNS record at all — so both badges were rendering as broken images on the
public profile. Two changes:

- **Profile README** — both `<img>` blocks are now wrapped in HTML comments, marked
  `analytics-badge:hidden`. These are pure insertions: the markup is preserved byte
  for byte, so restoring is just deleting the wrappers. They still sit outside the
  `SELECTED-WORK` markers, so `sync-landing.mjs` is unaffected, and the commented
  URLs still match the 10-places `sed` one-liner.
- **`analytics/HANDOFF.md`** — new. Deliberately scoped to *the deploy task* rather
  than to repo state, so it does not become a second thing to keep in sync with the
  copy-block above. It carries a paste-ready block for claude.ai and a checklist
  that ends in "un-hide the badges, then delete this file".

Why the deploy did not simply happen: `wrangler login` is an interactive browser
OAuth flow, and this work runs in a headless container, so it cannot authenticate as
Satej. Everything else a deploy needs *is* reachable from there — Node 22, the npm
registry, and `api.cloudflare.com` (verified: a genuine `cf-ray` response) — so a
scoped `CLOUDFLARE_API_TOKEN` set as an environment secret is a workable alternative
to running the commands by hand.
