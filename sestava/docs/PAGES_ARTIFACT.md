# GitHub Pages artifact hardening

## Pages mechanism

Local `.publish/` does **not** change GitHub Pages by itself. Deploy happens
only when the allowlist workflow runs and Pages is configured to use
**GitHub Actions** as source.

Operator reports Pages source switched to GitHub Actions. Workflow file
contents alone do **not** prove that Settings → Pages is correct — verify
there before relying on docs isolation after push. A branch-root source would
still publish committed tree paths (including `sestava/docs`).

## Allowlist builder

```powershell
node scripts/prepare-publish.mjs
# or
powershell -NoProfile -File scripts\prepare-publish.ps1
```

Output: `.publish/` (gitignored) + `PUBLISH_MANIFEST.txt`.

## Proposed Actions deploy

File: `.github/workflows/pages-from-artifact.yml`

- `workflow_dispatch` only — **no push trigger**
- Requires typing `PUBLISH` as input
- Deploy job uses Environment `publication-approval` (add reviewers in GitHub)
- Must not be enabled for auto-publish without explicit approval

## Legal / production

Artifact readiness ≠ publication approval. Privacy DRAFT and production
disabled remain separate blockers.
