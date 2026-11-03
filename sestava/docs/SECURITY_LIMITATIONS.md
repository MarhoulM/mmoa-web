# Sestava web — security limitations

Static GitHub Pages + supabase-js browser client.

## Mitigations in place

- Fail-closed public config (no URL/key → no API)
- `deletionEnabled` gate + staging-only environment check
- No `user_id` in Edge body; server is authority
- Password reauth before delete; Edge checks AMR freshness
- DOM built with `textContent` / `createElement` for dynamic preflight (avoid HTML string injection of team names)
- Privacy / delete-account `noindex` while DRAFT / pre-launch
- Mock harness outside publish tree

## Residual / inherent limits

| Topic | Note |
|-------|------|
| XSS | Still possible if future code uses `innerHTML` with untrusted data; review PRs |
| External script | supabase-js from jsDelivr CDN — supply-chain / SRI not pinned |
| CSP | Feasible via meta/headers on Pages (limited); not shipped yet |
| Token storage | supabase-js local persistence — XSS can steal session |
| CSRF | Bearer JWT in Authorization; classic cookie CSRF less relevant; still need origin allow-lists |
| Clickjacking | Consider `X-Frame-Options` / CSP `frame-ancestors` if host supports |
| Rate limiting | Relies on Edge/Auth; browser cannot enforce |
| Login errors | Generic Czech message (no account enumeration detail) |
| History | Back button may show prior steps; session still required for actions |
| Information leakage | Env banner shows environment name; OK for staging |
| Staging on Pages | Must stay disabled publicly — accidental enable would expose staging deletion |

## Auth URL allow-list

Before enabling live Auth from Pages, add the exact HTTPS origin + path to Supabase Auth redirect URLs. Localhost entries must not be the only allow-list in production.

## Do not log

Passwords, JWTs, refresh tokens, full e-mail lists in support dumps.
