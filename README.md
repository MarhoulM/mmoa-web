# mmoa-web

Static site for **MMOA** (brand / future studio label — not a legal entity by itself):

- Studio home (`index.html`)
- MathOut Privacy Policy (`mathout/privacy/`)
- Sestava section (`sestava/`) — landing, privacy (DRAFT), support, account deletion

## Local preview

```powershell
npx --yes serve -l 5500
```

## Publish artifact

Allowlist-only build (no docs, no mocks):

```powershell
node scripts/prepare-publish.mjs
```

Output: `.publish/` (gitignored). Workflow: `.github/workflows/pages-from-artifact.yml`
(`workflow_dispatch` only + explicit `PUBLISH` input — not auto-publish on push).

Operator reports Pages source set to GitHub Actions. That is an operational
assumption: confirm in repository Settings before treating a push as safe for
docs isolation. A branch-root Pages source would still expose the full tree.

## Privacy

Controller legal name and Article 6 bases remain TODO in both policies. Sestava privacy stays DRAFT + `noindex`. Account deletion stays fail-closed in public `config.js`.
