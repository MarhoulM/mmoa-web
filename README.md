# mmoa-web

Public static site for **MMOA** (brand / studio label — not a legal entity by itself).

## Pages

- Studio home — `/`
- MathOut Privacy Policy — `/mathout/privacy/`
- Sestava landing — `/sestava/`
- Sestava interactive demo — `/demo/` (Flutter Web; synced from Sestava)
- Sestava Privacy Policy — `/sestava/privacy/`
- Sestava Support — `/sestava/support/`
- Sestava Account Deletion — `/sestava/delete-account/`

Hosted via GitHub Pages (Actions allowlist artifact, `workflow_dispatch` only). Sestava account deletion stays disabled in the public browser config until separately enabled.

## Demo (CI or local)

**CI publish** builds Flutter demo from a pinned Sestava SHA (no `demo/` in git).  
See workflow inputs in `.github/workflows/pages-from-artifact.yml` and Flutter pin in `.github/flutter-sdk-version`.

Secret required on this repo: `SESTAVA_READ_TOKEN` (Contents: Read on Sestava + Baser). Never commit it.

**Local preview** (optional):

```powershell
cd ..\Sestava
./tool/build_web_demo.ps1 -SyncToMmoaWeb
cd ..\mmoa-web
node scripts/prepare-publish.mjs
```

`demo/` is gitignored (large). `prepare-publish` fails closed if it is missing.

## Local preview

```powershell
npx --yes serve -l 5500
```

Open `/sestava/` and `/demo/` after a local sync.
