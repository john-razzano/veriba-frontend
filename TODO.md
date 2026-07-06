# Veriba — working TODO

State as of July 5, 2026: full two-sided loop is live against the real
backend — members browse/save/follow/search/approve-with-signature/earn credits/book;
providers document, request consent, publish, and manage their public page
(bio/avatar/booking + featured pin + services, all persisted).
Backend `ae383e8` · DB at migration `0005`, 56/56 tests.
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

- [x] **Session restore after JS reload.** FIXED July 5 (`c5df5f3`) — restore moved to
  the root layout (reloads could mount a restored route without ever rendering
  app/index); bootstrap backgrounds; login redirects when already authed.
- [x] **Inbox "Earlier" activity.** DONE July 5 — backend `GET /api/me/activity`
  (derived, no new tables, 42/42 tests) + app wiring (`c5df5f3`). Verified live:
  real credit/approval events render in the Inbox.
- [x] **Feed pagination.** DONE July 5 (`c5df5f3`) — infinite scroll pages the gallery
  by raw offset with dedupe; needs >48 published cases to observe.

## Later — provider side & polish

- [x] **Public page Phase 2 + blurhash.** DONE July 5 — backend `ae383e8`
  (migration `0005`: featured_session_id, services JSON, blurhash columns +
  backfill of 34 sessions & avatar, 56/56 tests) and app wiring: blurhash
  placeholders on every image surface (mosaic, search, saved, clinic grid,
  detail slider, my-results), services chips + FEATURED hero on the public
  clinic page, services persisted from the provider editor, and a
  pin/unpin-featured button on the published-session detail. Verified live:
  pin → alert → public page hero updates; unpin falls back to latest case.
  (Hide/reorder deliberately descoped — unpublish covers removal.)
- [ ] **Phase 3 — growth layer**: frontend wired July 5 against `GROWTH-SPEC.md`
  (backend repo) — **awaiting backend agent**. Consult requests (member form via
  clinic-page chat bubble / Book-consult fallback; provider Messages tab is now a
  real inbox with mark-handled), hours editor + public display with Open-in-Maps
  link (live now — link-out, no native map), per-case saves + follower counts.
  Until the backend lands, Messages shows the empty state and consult submits fail.
- [x] **Provider reskin (P1/P2/P4).** DONE July 5 (`c458545`) — dashboard mosaic with
  status pills, Activity screen grouped by approval state (surfaces "needs
  obscuration" on blur-gated cases), Messages placeholder tab, account header
  restyle, 5-item provider tab bar. Bonus fix: rotated auth tokens now persist to
  SecureStore (was silently logging users out after ~30 min + reload).
- [ ] **Multi-photo cases**: frontend thumbnail strip on the case detail done
  July 5 (swaps the slider's after side, "Final" + labeled angles) — appears once
  the backend ships `photos[]` + seeds the two `*_mid.jpg` triptychs (GROWTH-SPEC §2).
- [ ] **Approval push notifications**: plumbing wired July 5 — expo-notifications
  in the dev client, permission prompt + token registration on bootstrap,
  deregistration on logout, backend sender spec'd (GROWTH-SPEC §4). **Delivery
  stays dark until John adds an APNs key in EAS** (needs Apple dev account) and we
  test on a physical device — simulators can't receive remote pushes.
- [x] **Haptics.** DONE July 5 — dev client rebuilt with expo-haptics (+
  expo-notifications); light impact on case-tile taps and when the compare slider
  crosses center. Feel it on device; simulator no-ops.

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
