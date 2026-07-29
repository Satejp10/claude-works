# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A publishing space for visual work produced by Claude — infographics, data
visualizations, and design experiments. It is **not** a typical application:
there is no build system, no test suite, and no linter. Each work is a
self-contained static HTML file in `works/`, served live via
**GitHub Pages** at https://satejp10.github.io/claude-works/.

## Commands

There is no build, test, or lint step. The only tooling is two Node scripts under
`.github/scripts/` (CI runs them on Node 20):

```bash
npm install playwright   # then: npx playwright install chromium (first run only)

# render thumbnails for local works + rebuild the README gallery block
node .github/scripts/gen-thumbnails.mjs

# rebuild only the gallery block — skips rendering, needs no Playwright
SKIP_RENDER=1 node .github/scripts/gen-thumbnails.mjs

# preview the profile mirror against a local clone of Satejp10/Satejp10
# (writes to that clone; inspect with `git diff` there, don't commit blindly)
node .github/scripts/sync-landing.mjs ../Satejp10/README.md
```

`package.json`, `package-lock.json`, and `node_modules/` are **gitignored** —
Playwright is installed ad hoc and never committed. CI pins `playwright@1.61.0`.

## Architecture: the README table drives everything

The **Works table in `README.md`** is the source of truth. `gen-thumbnails.mjs`
(`parseWorks`) regex-parses that table, so the row format is a contract:

```
| **Name** — description | Type | Date | [View](https://…/FILE.html) · [Source](works/FILE.html) |
| **Name** — description | Type | Date | [View](https://…) · [Source](https://…) · [Thumb](assets/thumbnails/FILE) |
```

- A row is recognized as a work if it contains **either** a `(works/FILE.html)` Source link **or** an explicit `[Thumb](assets/thumbnails/…)` link. Header/separator/other rows are skipped.
- The displayed title and gallery link are derived from the row — the `**bold**` name and the `[View](url)`.
- The thumbnail is the explicit `[Thumb]` image if present; otherwise it's the rendered PNG derived from the source filename (`.html` → `.png`).
- An explicit `[Thumb]` (e.g. a `.gif`) is used **as-is and the work is not rendered**. This is also how an **external** project (one hosted in another repo, with no `works/` file) gets a gallery entry: a `View` link to its live demo, a `Source` link to its repo, and a `Thumb`.

From each parsed row the generator:
1. **Local works without a `Thumb`:** serves the repo root over a local static server (port 8731) and renders the work in headless Chromium at **1200×750**, capturing the **top fold** (works use a 640px mobile breakpoint, so 1200 forces the desktop layout; it waits ~2.2s for fonts/animations), writing a PNG to `assets/thumbnails/`. Works with a `Thumb` are skipped (their image is committed by hand). Playwright is imported lazily, so `SKIP_RENDER=1` (or a table with nothing to render) rebuilds only the gallery without it.
2. Rewrites the block between `<!-- GALLERY:START -->` and `<!-- GALLERY:END -->` in `README.md`.

**Never hand-edit the gallery block or `assets/thumbnails/` — both are generated.**
The generator refuses to run if it parses zero works (guard against wiping the
gallery), and throws if the gallery markers are missing.

## Unindexed files at the repo root

Not everything tracked here is a *work*. `llm_cheatsheet_website.jsx` sits at the
**repo root** rather than in `works/`: it is a React component (it imports `react`
and `lucide-react`), so it can't be served as a static page and is deliberately
left out of the Works table. The generator ignores it, and it never reaches the
gallery or the profile mirror. Promoting it means first rewriting it as a single
self-contained HTML file per the authoring conventions below, then moving it into
`works/` and adding a table row.

**Expect new files to arrive at the root.** Satej builds works in Claude Design on
claude.ai and uploads them straight to GitHub through the web UI; "Add files via
upload" commits always land at the **root**, never in `works/`. This is his normal
workflow, not a mistake — a new root file generally means "here is a new work,
please file it properly." So when one appears: move it into `works/`, add a Works
table row, and add a bullet to `works/README.md`. If it looks like it duplicates an
existing work, **diff the two before assuming the indexed copy is newer** — an
upload has already turned out to be a newer revision of a published work
(`ai-accelerators-2026.html`, Jul 2026), meaning the gallery was serving a stale
page. Pages serves the repo root, so anything left there is publicly reachable but
unlisted.

## CI loop avoidance (read before touching the workflow)

`.github/workflows/thumbnails.yml` runs the generator on push to `main`, but its
`paths:` filter is deliberately limited to `works/**` and the
generator/workflow files — **not** `README.md` or `assets/`. The bot commits its
output (which touches exactly those two) with `[skip ci]`. Both mechanisms exist
to stop the bot's own commit from re-triggering the workflow; preserve them if
you edit the trigger.

## Authoring conventions for works

The HTML files are fully self-contained: all CSS and JS live **inline**, the only
external references are Google Fonts CDN links, and there are no local asset
dependencies and no charting libraries (charts/animation are hand-written in a
single inline `<script>`). This means any work can be opened directly in a
browser to preview it. Keep new works to this single-file, CDN-only pattern so
the generator and Pages hosting keep working.

## Adding a work

1. Drop the self-contained `.html` into `works/`.
2. Add a row to the Works table in `README.md` following the format above (and a matching bullet in `works/README.md`).
3. Commit and push to `main`. The workflow renders the thumbnail, rebuilds the gallery, and Pages redeploys automatically.

### External works (hosted in another repo)

A work living in its **own repo** (e.g. EDGE, Plot Light Study) is listed via
the `[Thumb]` pattern instead of a `works/` file: give the Works
row a `[View]` (live demo), `[Source]` (repo), and `[Thumb](assets/thumbnails/…)`
where the thumbnail is a **hand-captured** screenshot you commit (external works
are never auto-rendered). Do **not** add them to `works/README.md`.
Because such an addition only touches `README.md` + `assets/`, it does **not**
match `thumbnails.yml`'s `paths:` filter, so the workflow won't auto-run —
rebuild the gallery locally with `SKIP_RENDER=1 node .github/scripts/gen-thumbnails.mjs`
and, to mirror to the profile, trigger the workflow manually.

## Profile mirror

The gallery is mirrored into the `Satejp10/Satejp10` profile README's
`## Selected work` section by `.github/scripts/sync-landing.mjs`, run as the
final steps of `thumbnails.yml`. It replaces only the block between the
`<!-- SELECTED-WORK:START/END -->` markers in the profile README and rewrites
thumbnail `src` paths to absolute `raw.githubusercontent.com` URLs. It is gated
on the `LANDING_SYNC_TOKEN` secret (a fine-grained PAT with `Contents: write` on
`Satejp10/Satejp10`); without it the sync steps skip and CI stays green. **Local
works auto-sync on push to `main`; external works don't trigger the workflow, so
run it manually to sync them.** Full write-up: [`docs/sync-log.md`](docs/sync-log.md).

## Keeping this log current

[`docs/sync-log.md`](docs/sync-log.md) is the human-readable history of how this
repo works, and it is the file Satej pastes into claude.ai to catch up a Claude
that has no memory of this project. It has two parts:

1. A **fenced copy-block at the top** — a self-contained summary of the current
   state, sized to be copied in one tap on mobile.
2. **Dated history below it** — how things came to be.

**When you make a change that alters how the repo works** — the workflow, the
scripts, the folder layout, the mirror, the set of works — update both:
**rewrite** the copy-block so it describes reality (do not append to it; it must
stay short and must never describe a past state), and **append** a dated entry to
the history. A change that only touches a single work's content doesn't need an
entry.

This matters because nothing enforces it automatically. The log previously sat
for two weeks telling readers to go create a PAT that already existed.

## Note

Automated review (CodeRabbit) is intentionally disabled via `.coderabbit.yaml`;
comment `@coderabbitai review` on a PR for a one-off review.
