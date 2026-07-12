# claude-works → satejp10 profile mirror — setup & change log

_Last updated: 2026-07-12_

This log documents the automation that keeps the **satejp10 profile README's
"Selected work" section** in sync with the **claude-works gallery**, plus the
external-project pattern used to list sites that live in other repos. Written so
it can be folded into `CLAUDE.md` / claude.ai project instructions.

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

## 3. One-time setup (required to activate the sync)

1. Create a **fine-grained Personal Access Token**:
   - Repository access: **only `Satejp10/Satejp10`**
   - Permissions: **Contents → Read and write**
2. Add it to the **claude-works** repo as an Actions secret named
   **`LANDING_SYNC_TOKEN`** (Settings → Secrets and variables → Actions).

Until this secret exists the sync steps skip — nothing breaks, the profile just
isn't auto-updated.

---

## 4. How the sync triggers

| Change type | Auto-triggers workflow? | How the profile updates |
|---|---|---|
| **Local HTML work** (file under `claude-design-works/**`) | **Yes** — matches the workflow `paths:` filter. | Fully automatic: push to `main` → render → rebuild gallery → sync to profile. |
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
3. **Do NOT** add it to `claude-design-works/README.md` (there's no local file).
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

## 9. End-to-end test result (2026-07-12)

Manually dispatched the workflow after #9 merged (run #7,
`actions/runs/29189565487`) → **success**. The render + gallery-rebuild steps
ran, and the two sync steps (`Checkout landing profile repo`,
`Mirror gallery into landing profile`) correctly reported **`skipped`** because
**`LANDING_SYNC_TOKEN` is not set yet**. So the whole pipeline and the token
gate are validated; the profile will update on the next run once the token is
added (§3). To activate: add the secret, then re-run the workflow (Actions →
*Generate work thumbnails* → **Run workflow**) — Plot Light Study will appear in
the profile's `Selected work` section.
