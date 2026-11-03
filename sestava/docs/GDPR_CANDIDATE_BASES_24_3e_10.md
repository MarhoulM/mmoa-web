# Candidate GDPR Art. 6 mapping (not legally approved)

All bases are **candidates** until counsel/owner confirms.

## MathOut

| Data category | Purpose | Candidate basis | Technical evidence | Legal confirm |
|---------------|---------|-----------------|--------------------|---------------|
| Local progress/prefs | Provide app | 6(1)(b) contract and/or 6(1)(f) LI | On-device storage | Yes |
| Advertising IDs / AdMob signals | Show ads (confirmed AAB) | 6(1)(a) consent (UMP) ± LI for strictly necessary | UMP + AdMob; Google often independent controller | Yes |
| UMP choices | Record consent UI | Consent / accountability | UMP SDK | Yes |
| Play purchase metadata | Fulfil IAP | 6(1)(b) | Play Billing | Yes |
| RevenueCat anonymous ID + entitlements | Manage ad-free | 6(1)(b); RC processor under DPA | RC SDK | Yes |

**Do not confuse:** UMP consent ≠ automatic legal basis for *all* MathOut processing.

## Sestava (planned MVP)

| Data category | Purpose | Candidate basis | Technical evidence | Legal confirm |
|---------------|---------|-----------------|--------------------|---------------|
| Auth email/password | Account | 6(1)(b) | Supabase Auth | Yes |
| Profile display name | Identify in team | 6(1)(b) | profiles | Yes |
| Membership / roles | Team ops | 6(1)(b) | team_members / periods | Yes |
| Events / attendance / nominations | Scheduling | 6(1)(b) | event_* tables | Yes |
| Invitee email | Invite to team | 6(1)(b) / 6(1)(f) / consent toward invitee | invitations + Resend plan | Yes |
| Resend delivery logs | Deliver/debug mail | 6(1)(b) or 6(1)(f) | invitation_email_send_attempts + Resend | Yes |
| FCM push token | Notify user | 6(1)(b) and/or consent; OS permission ≠ GDPR consent alone | device_push_tokens | Yes |
| Team logos | Branding | 6(1)(b) | Storage path | Yes |
| Deletion request rows | Honour erasure | 6(1)(c) and/or 6(1)(b) | account_deletion_requests | Yes |
| Residual „Bývalý člen“ history | Team continuity | 6(1)(f) LI candidate | scrub keeps rows | Yes |
| Orphan Storage objects | Unintended | Minimize; weak basis until GC | GC deferred | Yes |

**Do not confuse:** Android notification permission ≠ Art. 6 consent for all purposes.  
**Do not confuse:** Pseudonymization („Bývalý člen“) ≠ anonymization.
