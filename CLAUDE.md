# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A publishing space for visual work produced by Claude — infographics, data
visualizations, and design experiments. It is **not** a typical application:
there is no build system, no test suite, and no linter. Each work is a
self-contained static HTML file in `claude-design-works/`, served live via
**GitHub Pages** at https://satejp10.github.io/claude-works/.

## The one command

There is a single piece of tooling — the thumbnail/gallery generator:

```bash
npm install playwright   # then: npx playwright install chromium (first run only)
node .github/scripts/gen-thumbnails.mjs
```

`package.json`, `package-lock.json`, and `node_modules/` are **gitignored** —
Playwright is installed ad hoc and never committed. CI pins `playwright@1.61.0`.

## Architecture: the README table drives everything

The **Works table in `README.md`** is the source of truth. `gen-thumbnails.mjs`
(`parseWorks`) regex-parses that table, so the row format is a contract:

```
| **Name** — description | Type | Date | [View](https://…/FILE.html) · [Source](claude-design-works/FILE.html) |
| **Name** — description | Type | Date | [View](https://…) · [Source](https://…) · [Thumb](assets/thumbnails/FILE) |
```

- A row is recognized as a work if it contains **either** a `(claude-design-works/FILE.html)` Source link **or** an explicit `[Thumb](assets/thumbnails/…)` link. Header/separator/other rows are skipped.
- The displayed title and gallery link are derived from the row — the `**bold**` name and the `[View](url)`.
- The thumbnail is the explicit `[Thumb]` image if present; otherwise it's the rendered PNG derived from the source filename (`.html` → `.png`).
- An explicit `[Thumb]` (e.g. a `.gif`) is used **as-is and the work is not rendered**. This is also how an **external** project (one hosted in another repo, with no `claude-design-works/` file) gets a gallery entry: a `View` link to its live demo, a `Source` link to its repo, and a `Thumb`.

From each parsed row the generator:
1. **Local works without a `Thumb`:** serves the repo root over a local static server (port 8731) and renders the work in headless Chromium at **1200×750**, capturing the **top fold** (works use a 640px mobile breakpoint, so 1200 forces the desktop layout; it waits ~2.2s for fonts/animations), writing a PNG to `assets/thumbnails/`. Works with a `Thumb` are skipped (their image is committed by hand). Playwright is imported lazily, so `SKIP_RENDER=1` (or a table with nothing to render) rebuilds only the gallery without it.
2. Rewrites the block between `<!-- GALLERY:START -->` and `<!-- GALLERY:END -->` in `README.md`.

**Never hand-edit the gallery block or `assets/thumbnails/` — both are generated.**
The generator refuses to run if it parses zero works (guard against wiping the
gallery), and throws if the gallery markers are missing.

## CI loop avoidance (read before touching the workflow)

`.github/workflows/thumbnails.yml` runs the generator on push to `main`, but its
`paths:` filter is deliberately limited to `claude-design-works/**` and the
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

1. Drop the self-contained `.html` into `claude-design-works/`.
2. Add a row to the Works table in `README.md` following the format above (and a matching bullet in `claude-design-works/README.md`).
3. Commit and push to `main`. The workflow renders the thumbnail, rebuilds the gallery, and Pages redeploys automatically.

## Note

Automated review (CodeRabbit) is intentionally disabled via `.coderabbit.yaml`;
comment `@coderabbitai review` on a PR for a one-off review.
