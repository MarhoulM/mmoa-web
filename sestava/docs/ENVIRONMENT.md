# Sestava web — environment configuration

## Principles

- Browser never receives `service_role`
- Public Pages default is fail-closed (no staging URL, deletion off)
- No automatic switch to production
- Production values are **not** invented here

## Public (committed) — `assets/config.js`

```js
environment: "disabled"
productionEnabled: false
deletionEnabled: false
supabaseUrl: ""
supabasePublishableKey: ""
expectedProjectRef: ""
```

Accidental GitHub Pages deploy of this file cannot call staging/production APIs.

## Local / staging override — `assets/config.local.js` (gitignored)

1. Copy `config.local.example.js` → `config.local.js`
2. Set staging project URL, publishable/anon key, and `expectedProjectRef`
3. Keep `productionEnabled: false`
4. Set `deletionEnabled: true` and `environment: "staging"` only for local testing
5. Delete-account page loads `config.js` then optional `config.local.js` (`onerror` safe)

## Future production (outline only)

Separate approval required. Suggested shape (values TBD by ops):

- Dedicated production project URL + publishable key
- Explicit `environment: "production"` **and** a new client allow-list (current client rejects production)
- Auth redirect allow-list for Pages origin
- CORS / Edge already JWT-gated; still require ops review
- Flip `deletionEnabled` only when Privacy Policy is final and Play URLs ready

Simplest static approach: keep committed `config.js` fail-closed; generate production config in a private CI step into `.publish/` artifact — never commit live production keys if policy forbids.

## Auth notes

- Session persisted in browser storage by supabase-js (`persistSession: true`)
- Reauth: password `signInWithPassword` before Edge call (fresh AMR)
- Logout: `signOut({ scope: 'local' })` after completed delete
