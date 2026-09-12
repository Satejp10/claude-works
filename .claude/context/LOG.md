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
