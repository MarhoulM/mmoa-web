# Sestava — production readiness roadmap (24.3e.10)

**Read-only plan.** No production project, secrets, deploy, or DB migrate from this task.

Owner-confirmed MVP intent: Supabase Auth, Resend invites, FCM push, web account deletion.
**Production environment: DISABLED.** No monetization.

## Status legend

| Tag | Meaning |
|-----|---------|
| READY-ISH | Implemented; needs prod wiring / approval |
| PARTIAL | Code exists; flags/defaults off or staging-only |
| MISSING | Not done for production |
| BLOCKED | Depends on owner/legal/ops decision |

---

## A. Supabase production setup

| | |
|--|--|
| **Current** | Staging project used in E2E; production project not activated |
| **Missing** | Dedicated prod project, region choice, DPA acceptance, secrets vault |
| **Deps** | Owner region + legal transfer review |
| **Risks** | Wrong region; mixing staging secrets into prod |
| **Order** | 1) Create empty prod project 2) Choose EU region if required 3) DPA 4) Apply migrations 5) Secrets |
| **Verify** | `EXPECTED_*_PROJECT_REF` match; no staging URL in release defines |

## B. Auth settings

| | |
|--|--|
| **Current** | Email/password Auth implemented; redirect allow-lists for staging/local |
| **Missing** | Prod site URL, redirect URLs for app links + Pages delete-account origin |
| **Deps** | Final public hosts |
| **Risks** | Open redirect / missing allow-list blocks login or delete |
| **Order** | Freeze public hosts → configure Auth URL allow-list → test sign-in/reauth |
| **Verify** | Sign-up, confirm, login, password reauth AMR for delete-account |

## C. Database migrations

| | |
|--|--|
| **Current** | Schema + account deletion foundation migrations in repo |
| **Missing** | Ordered apply on **new** prod (not staging push from this agent) |
| **Deps** | Prod project |
| **Risks** | Partial apply; RLS gaps |
| **Order** | Preflight scripts → apply in documented order → postchecks |
| **Verify** | SQL checks in `supabase/checks/*account_deletion*` |

## D. RLS

| | |
|--|--|
| **Current** | RLS forced on core tables in migrations |
| **Missing** | Prod smoke of each role path |
| **Deps** | Migrations applied |
| **Risks** | Over-broad grants; service_role misuse in clients |
| **Order** | Apply → authenticated/anon negative tests |
| **Verify** | Member cannot read other teams; prepare RPCs service_role only |

## E. Edge Functions

| | |
|--|--|
| **Current** | `delete-account`, `send-invitation-email`, `deliver-push-notifications` implemented; staging deploy history for delete-account |
| **Missing** | Prod deploy with `verify_jwt` policy per function; secrets |
| **Deps** | Prod Supabase + Resend + FCM creds |
| **Risks** | JWT off on delete-account; worker secret leak |
| **Order** | delete-account first → invite email → push worker |
| **Verify** | CONTRACT tests; staging E2E patterns against prod only after GO |

## F. Resend production delivery

| | |
|--|--|
| **Current** | Adapter + attempts table; default delivery often `disabled` |
| **Missing** | Prod domain, DNS, API key, `INVITE_EMAIL_DELIVERY=edge`, FROM identity |
| **Deps** | Domain ownership |
| **Risks** | PII in mail; US storage (Resend docs); spam |
| **Order** | Domain → DNS → secret → enable edge → send smoke to owned inbox |
| **Verify** | Attempt rows; no secret in client; scrub on deletion |

## G. FCM production delivery

| | |
|--|--|
| **Current** | Client + worker; `FIREBASE_ENABLED` default false |
| **Missing** | Prod Firebase/Android apps, `google-services`, worker SA, enable flags |
| **Deps** | Firebase project |
| **Risks** | Global FCM processing; token leakage in logs |
| **Order** | Firebase Android app → enable client → worker secret → smoke |
| **Verify** | Token register/refresh; invalid token cleanup; permission denied path |

## H. Android App Links

| | |
|--|--|
| **Current** | `app_links` + invite/join routes in app |
| **Missing** | Prod `assetlinks.json`, SHA-256, final host |
| **Deps** | Public HTTPS host |
| **Risks** | Broken deep links → failed invites |
| **Order** | Freeze host → publish assetlinks → device verify |
| **Verify** | Open invite link cold-start signed-out and signed-in |

## I. Web account deletion

| | |
|--|--|
| **Current** | UI + fail-closed `config.js`; local override via `config.local.js` |
| **Missing** | Approved prod/public config artifact; Auth allow-list; Pages from `.publish` |
| **Deps** | Privacy final; controller name |
| **Risks** | Accidental staging deletion on Pages |
| **Order** | Privacy final → allowlist artifact deploy → enable deletion only with prod keys under approval |
| **Verify** | Public Pages shows disabled until GO; then E2E without real delete in dry-run where possible |

## J. Storage cleanup

| | |
|--|--|
| **Current (24.3f.2)** | Local impl + security validation; READY FOR STAGING APPROVAL |
| **Missing** | Staging apply, secret, deploy, scheduler, SLA; local SQL not run (no Podman) |
| **Deps** | Staging GO + Storage |
| **Risks** | Orphans until worker runs; JWT left enabled on deploy |
| **Order** | Design ✓ → impl ✓ → security ✓ → staging approval → cron → prod |
| **Verify** | Deno GC tests; `18_storage_gc.sql` + postcheck on approved env |
| **Docs** | `STORAGE_GC_DESIGN.md` |

## K. Monitoring

| | |
|--|--|
| **Current** | Limited / staging-oriented |
| **Missing** | Prod alerts for Edge errors, email/push failure rates, deletion failures |
| **Deps** | Hosting choice |
| **Risks** | Silent delete/email failures |
| **Order** | Minimal logs (no PII/JWT) → alert on 5xx/rate_limit spikes |
| **Verify** | Synthetic probe |

## L. Backup and retention

| | |
|--|--|
| **Current** | Provider defaults; no app-level TTL for residual history |
| **Missing** | Documented backup retention; legal retention decision |
| **Deps** | Legal input |
| **Risks** | Backups retain scrubbed-before-backup PII |
| **Order** | Legal retention → configure provider backups → document |
| **Verify** | Restore drill on non-prod |

## M. Google Play Data Safety

| | |
|--|--|
| **Current** | Checklist only |
| **Missing** | Form filled to match MVP (Account, Email, Device IDs/push, Photos if logos, No ads) |
| **Deps** | Final privacy URL; prod behaviors |
| **Risks** | Mismatch with policy |
| **Order** | Final policy → Data Safety → store listing deletion URL |
| **Verify** | Peer review against this roadmap |

---

## Suggested sequence (high level)

1. Legal: controller name + Art. 6 candidates approval  
2. Prod Supabase project + region + migrations + RLS checks  
3. Auth URL allow-list + App Links host  
4. Edge `delete-account` on prod + web fail-open only under approval  
5. Resend domain + invite delivery  
6. FCM + push worker  
7. Storage GC  
8. Monitoring + backup policy  
9. Play Data Safety + listing URLs  

**This roadmap ≠ permission to publish or activate production.**
