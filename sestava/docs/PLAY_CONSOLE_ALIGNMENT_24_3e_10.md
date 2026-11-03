# Google Play consistency checklist (24.3e.10)

No Play Console changes from this task.

## MathOut

- [ ] Privacy Policy URL (public HTTPS) matches hosted `mathout/privacy/`
- [ ] Policy still has controller name placeholder → **not final for store until filled**
- [ ] Data Safety: approximate location? usually no; Device IDs / Advertising ID **Yes** (AdMob owner-confirmed)
- [ ] Data Safety: Purchase history / App interactions as applicable for Billing + ads
- [ ] Ads declaration: app contains ads **Yes**
- [ ] SDKs: AdMob, UMP, Play Billing, RevenueCat declared consistently
- [ ] Account creation: **No** → account deletion URL N/A
- [ ] Developer identity: natural person / brand string consistent with policy (not fake company)

## Sestava (before production launch)

- [ ] Privacy Policy final (remove DRAFT/noindex) with controller name
- [ ] Data Safety: Name, Email, User IDs, Photos (logos), Device IDs (FCM), Other in-app messages
- [ ] Account creation **Yes** → in-app delete **and** public web delete URL
- [ ] Web delete URL works without reinstalling app; not fail-closed staging
- [ ] Declare FCM / Resend / Supabase sharing accurately for MVP
- [ ] No ads / no IAP
- [ ] Android App Links host matches store / invite URLs
- [ ] Production App Links verified on device
