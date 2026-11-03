# GitHub Pages publication checklist (Sestava)

**Do not execute deploy from this task.** Use when a human later approves publish.

## Pre-publish

- [ ] Controller identity confirmed; Privacy DRAFT finalized or replaced
- [ ] Remove or keep `noindex` deliberately on privacy / delete-account
- [ ] `assets/config.js` still fail-closed **or** intentional production artifact reviewed
- [ ] `config.local.js` not present in publish tree
- [ ] `sestava/_local` / mock harness not present in publish tree
- [ ] Run `powershell -File scripts/prepare-publish.ps1` and inspect `.publish/`
- [ ] Relative links work under `/mmoa-web/`
- [ ] HTTPS Pages origin added to Supabase Auth redirect allow-list (if enabling Auth)
- [ ] Edge `delete-account` CORS / JWT settings reviewed for Pages origin
- [ ] MathOut pages unchanged smoke check
- [ ] No `service_role` / JWT / passwords in repo

## Pages settings (verify manually in GitHub UI)

- [ ] Source branch / folder matches intended publish root (repo root **or** `.publish` workflow)
- [ ] Custom 404 behavior acceptable for SPA-less static site
- [ ] Cache: hard-refresh after config changes

## Post-publish smoke (when approved)

- [ ] Landing `/mmoa-web/sestava/`
- [ ] Privacy reachable; robots meta as intended
- [ ] Delete-account shows disabled banner if backend not enabled
- [ ] No network calls to Supabase from public fail-closed config
- [ ] No mock success flows reachable

## Explicit non-goals until approval

- git push / Pages deploy from agent
- Enabling `deletionEnabled` on public Pages
- Production Supabase activation
