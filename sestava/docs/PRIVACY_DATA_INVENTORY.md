# Privacy data inventory (factual, from implementation)

Sources: Flutter deletion flow, Edge `delete-account` CONTRACT, DB prepare/dissolve tests/migrations.

Classification key:

- **P** personal
- **Ps** pseudonymized / residual after unlink (not automatic anonymity)
- **O** operational metadata
- **A** truly anonymous — **none claimed** for team history rows

| Area | Examples | Class | Notes |
|------|----------|-------|-------|
| Auth | email, user id, session | P | Deleted on successful Auth admin delete |
| profiles | display name | P → scrub | „Bývalý účet“ after prepare |
| team_members | user_id, display_name | P → Ps | user_id nulled; „Bývalý člen“ |
| membership periods | role intervals | O/Ps | Remain for team history |
| teams | name, logo_path | O | logo_path cleared on dissolve; Storage object GC deferred |
| events | schedule metadata | O | Team-scoped |
| attendance / nominations | member-linked states | Ps after delete | Rows may remain without user_id |
| invitations | invitee email, status | P | Scrubbed for deleted user’s invites |
| push tokens | device token, platform | P | Removed for deleted user |
| notification outbox | delivery state, payload | O | Cleaned / payload emptied on prepare |
| invitation email attempts | delivery logs | O | Operational |
| account deletion requests | status machine | O | Process audit |
| Storage logos | binary objects | may retain P | Path nulled; **orphan files = publication risk** until GC |

## External processors (when enabled)

- Supabase (Auth, DB, Edge, Storage)
- E-mail provider for invites — identity TBD for production
- Push provider — identity TBD for production
