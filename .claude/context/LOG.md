# Project Log — claude-works

Append-only history of working sessions. **Newest entry at the bottom.** One entry
per session. Never edit or delete a past entry — if something recorded earlier was
wrong, add a new `CORRECTION` entry that supersedes it. Keep entries factual and
durable (decisions, state changes, dead ends, blockers), not narration. Secrets are
referred to by name only, never by value.

Entry format:

```
## <UTC date> — <session id or "local"> — <one-line title>
- what changed / what was decided / what was verified
- blockers / open questions
- report generated: SR-claude-works-NNN (if any)
```

---

## 2026-09-12 — session_019i1WumsK2T8NcdLvSESreQ (claude code web) — Bootstrap log + renew profile-mirror token
- Bootstrap: no prior `.claude/context/` existed. Reconstructed project history from git, `CLAUDE.md`, and `docs/sync-log.md`; created this log.
- Operational fix (not in git): the **`LANDING_SYNC_TOKEN`** fine-grained PAT had **expired**. Diagnosed it as the GitHub-Actions token that mirrors the gallery into the `Satejp10/Satejp10` profile README (Contents:RW on the profile repo only; used by CI, not by Claude). Walked the user through: regenerate → rename the token for clarity → update the **existing** Actions secret value (same secret name `LANDING_SYNC_TOKEN`; do **not** create a new secret / change the name — the workflow reads it by that exact name). User reported the secret updated.
- Verified this session: `origin/main` at `f3c4307` (PR #19, 2026-09-12); 69 commits; gallery has **12 works** (10 local in `works/` + 2 external: EDGE, Plot Light Study); working tree clean. Restarted branch `claude/kind-hopper-q50b2v` from `origin/main` (it held only already-merged history; its prior PR #5 was merged).
- Not verified: the renewed token's secret value; a green thumbnails-workflow run post-renewal (not yet triggered); analytics Worker deploy status (still undeployed per `docs/sync-log.md` §11).
- Open: deploy vs. drop the analytics Worker; redact PII (phone) on `terminal-portfolio.html`; renewed-token expiry date (for a renewal reminder).
- report generated: SR-claude-works-001

## 2026-09-23 — session_019i1WumsK2T8NcdLvSESreQ (claude code web, continued from 2026-09-12) — Phone redaction, renewed token verified, works/ conventions hook
- 2026-09-12 (after SR-001): removed the phone-number contact row from `works/terminal-portfolio.html` outright (the `tel://` was a label, not a link; email/LinkedIn/GitHub rows remain) — PR #21, `b4b0e36`. Live page re-checked 2026-09-23: HTTP 200, number and label absent.
- 2026-09-12: renewed `LANDING_SYNC_TOKEN` verified working — thumbnails run #13 (manual dispatch) and run #14 (PR #21 merge push) both green; run #14 steps "Checkout landing profile repo" and "Mirror gallery into landing profile" = success. This closes the "not verified: green run post-renewal" item from the previous entry.
- 2026-09-23: added a report-only Claude Code `PostToolUse` hook (`Edit|Write`) — `.claude/settings.json` + `.claude/hooks/check-works-conventions.mjs`; checks `works/*.html` for og:title/description/image/url (og:image absolute https) and the visit-beacon markers; stderr + exit 2 on problems, silent exit 0 otherwise; never edits files. Pipe-tested (clean → exit 0; og:image removed → 1 line, exit 2). PR #23 merged 2026-09-23. Not yet observed firing in a live session (settings load at session start).
- Found: 8 of 10 local works fail the new og check (only gpt5-transition-reddit and model-switching-drift pass; all 10 have the beacon). The phone number is still in public git history (added `6545260` 2026-06-22, removed `b4b0e36`); the thumbnail never showed it.
- Found: `docs/sync-log.md` copy-block is stale ("10 works — 8 local"; actual 12, 10 local) and neither it nor `CLAUDE.md` mentions the hook; `docs/analytics-deploy-log.md` still says beacons in "all 8" works (actual 10). Not fixed this session.
- Open: accept vs. scrub the phone number from git history; backfill og tags on 8 pages; analytics deploy vs. drop; renewed-token expiry date (for a reminder).
- report generated: SR-claude-works-002
