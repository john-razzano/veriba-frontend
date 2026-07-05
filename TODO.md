# Veriba — working TODO

State as of July 4, 2026 (evening): full two-sided loop is live against the real
backend — members browse/save/follow/search/approve-with-signature/earn credits/book;
providers document, request consent, publish, and manage their public page.
Frontend `e2e4aed` · backend `a7b6072` · DB at migration `0004`.
Test accounts: member `member2@veriba.app` / `supersecret1` · provider
`owner+atelier@veriba-demo.studio` / `veriba-demo-2026`.

## Now — correctness & security

- [ ] **Stable API hostname.** The quick trycloudflare URL rotates whenever the tunnel
  restarts, breaking `EXPO_PUBLIC_VERIBA_API_BASE_URL` and all stored image URLs.
  Move to a named Cloudflare tunnel / real domain before wider testing. *(Needs
  John's Cloudflare account.)*
- [ ] **Configure Resend** so follow-up emails actually send — the emailed web link is
  the approval path for patients without the app. *(Needs John's Resend API key.)*
- [ ] **Blur tooling for `full_blur` consent.** Publishing is safely gated (see Done),
  but there's still no way to actually obscure pixels post-consent — providers need
  an obscuration step (the wizard's editor applies it pre-upload only) before a
  blur-consented case can go live. Longer-term: private bucket + signed URLs.

## Next — consumer surface

- [ ] **Session restore after JS reload.** Reloads (and some cold starts) land on the
  login screen despite tokens in SecureStore — restoreSession isn't kicking in
  reliably. Annoying in dev; would log out real users on OTA updates.
- [ ] **Inbox "Earlier" activity.** Needs a backend events feed (result viewed N
  times, case published, credit expiring) + `GET /api/me/activity`; the mock version
  was removed so the inbox shows only true things.
- [ ] **Feed pagination** past the current 48-case load (plus infinite scroll).

## Later — provider side & polish

- [ ] **Public page Phase 2**: pin a featured case (`featured_session_id` — the
  serializer half-supports it), hide/reorder cases on the public grid, persist
  services server-side (the Account "Services Offered" toggles are client-only
  today) and render a services menu on the clinic page linking to filtered grids.
- [ ] **Phase 3 — growth layer**: native consult-request messaging (Book consult
  currently opens the clinic's `booking_url`), hours/map (lat/lng columns exist),
  provider analytics surfaced in-app (`page_views` is already tracked per case).
- [ ] **Provider reskin (spec P1/P2/P4).** Dashboard mosaic with status pills,
  Activity screen grouped by approval state, provider account restyle — provider
  side still runs the pre-redesign UI.
- [ ] **Multi-photo cases.** The triptych `*_mid.jpg` extras sit unseeded in backend
  `seed_assets/`; add `photos[]` to the case-study payload + a thumbnail strip on
  the detail that swaps the slider's after-side (angles/stages).
- [ ] **Approval push notifications** — a new followup should ping the member's
  phone, not wait to be discovered in Inbox.
- [ ] **Haptics** (`expo-haptics`, needs a dev-client rebuild): light impact on tile
  taps and when the compare slider crosses center.
- [ ] **Image loading polish**: blurhash placeholders computed at upload, returned by
  the gallery API, consumed by `expo-image`.

## Housekeeping

- [ ] Desktop `verbia_real_before_after/split/` (failed first-pass splits) can be
  deleted; `split-v2/` is canonical and committed to the backend repo.
- [ ] `docs/veriba-archireum-mockup.html` + `docs/veriba-feed-explorations.html` are
  rejected design explorations — delete or keep as history.

## Done (July 3–4)

- [x] Alembic setup + baseline; member role & consumer registration (backend `5eb6c13`)
- [x] Role-aware app shell; consumer screens C1–C3, C5–C7; 3-col IG mosaic; expo-image
- [x] Real photography: 18 pairs split (seam detection, watermark/label removal),
  seeded as **Veriba Atelier**; app reads the live gallery — zero mock imagery left
- [x] Saves, follows, live search, `GET /api/me/results` + My before & afters screen
- [x] **C4 in-app consent loop** — approval → four tiers → signature → credit issued
  (verified: $150 credit end-to-end)
- [x] **Privacy fixes** (backend `18cc5f3`): partial consent no longer exposes the
  before image publicly; `full_blur` gated from all publish paths; + tests
- [x] JWT secret rotated off the 9-byte default (64-char hex)
- [x] Case detail real metadata; live category chips + pull-to-refresh
- [x] Public clinic pages + clinic taps everywhere; **provider-managed public page
  Phase 1** (bio/avatar/booking_url, editor with member preview, migration `0004`,
  backend `a7b6072`) — Book consult now opens the clinic's booking link
- [x] `reset_demo_data.sh --slug` per-practice cleanup; followup-cascade bugfix;
  orphaned `member@veriba.app` deleted; keyboard-avoiding auth form
