# Sestava (MMOA web section)

Static pages under `/sestava/` for GitHub Pages project site
(`base path /mmoa-web/`).

## Local preview

```powershell
cd C:\gitPersonal\mmoa-web
npx --yes serve -l 5500
```

Open `http://localhost:5500/sestava/`.

## Account deletion

- **Public page:** `sestava/delete-account/` — fail-closed by default (`assets/config.js`).
- **Local staging:** copy `assets/config.local.example.js` → `config.local.js` (gitignored).
- **Mock harness (no Auth):** sibling repo `Sestava/tools/mmoa-web-local/mock/` — not published here.

## Config

| File | Purpose |
|------|---------|
| `assets/config.js` | Committed fail-closed defaults |
| `assets/config.local.js` | Local staging override (gitignored) |
| `productionEnabled` | Must stay `false` until separate approval |

Never put a privileged server key in browser config.

## Docs

See [`docs/README.md`](docs/README.md) for the operator doc index.
Privacy Policy remains DRAFT + `noindex` until legal inputs are complete.

## Publish artifact (no deploy)

```powershell
node scripts\prepare-publish.mjs
```

Inspect `.publish/` before any human-approved Pages deploy. Creating `.publish/`
does **not** change the GitHub Pages source by itself.

## Tests

```powershell
node C:\gitPersonal\Sestava\tools\mmoa-web-local\delete-account.test.mjs
node C:\gitPersonal\Sestava\tools\mmoa-web-local\artifact-audit.mjs
```
