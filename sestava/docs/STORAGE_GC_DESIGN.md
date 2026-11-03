# Team logo Storage GC — 24.3f.2

**Status:** READY FOR STAGING APPROVAL (local only). Not deployed.

Canonical detail: Sestava repo `docs/STORAGE_GC_DESIGN.md`.

## Mechanism

Retire queue `storage_gc_queue` + Edge `gc-team-logos` (Bearer `STORAGE_GC_WORKER_SECRET`).
Evaluate active `logo_path` before Storage remove; live-logo DELETE trigger as TOCTOU guard;
`claimed_by` required on complete.

## 24.3f.2 validation

- Auth / RLS / concurrency / path guards reviewed locally.
- Deno GC tests expanded (secrets, Bearer malformations, 403/500, complete-after-delete, discover non-blocking).
- SQL suite present (`18_storage_gc.sql`) but **not executed** without local Supabase DB.
- Staging test plan documented in Sestava `STORAGE_GC_DESIGN.md` — approval-gated.
