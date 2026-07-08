# Veriba — working TODO

State as of July 6, 2026: full two-sided loop is live against the real
backend, now including the Phase 3 growth layer — consult requests, hours,
multi-photo cases, analytics counts, push plumbing (delivery pending APNs).
Backend `a99a434` · DB at migration `0006`, 74/74 tests.
Test accounts: member `member3@veriba.app` / `supersecret1` (member2 was wiped
by backend e2e side effects — again; see Housekeeping) · provider
`owner+atelier@veriba-demo.studio` / `veriba-demo-2026`.

## Now — correctness & security

- [ ] **OAuth (Apple + Google)** — built July 7, awaiting John's live sign-in
  tests. Backend `f5975a2` (migration `0008`, 98/98 tests): `POST
  /api/auth/oauth` verifies provider JWTs against JWKS, links by subject →
  verified email → creates member. Frontend: native Apple/Google buttons on
  the auth screen (hidden for clinic signup), Google client ID from Firebase
  project `veriba-4acaa`, dev client rebuilt with both modules. Verified: the
  Google consent sheet opens in-simulator. Remaining: John completes a Google
  sign-in (simulator ok) and an Apple sign-in on his iPhone (needs one Xcode
  rebuild; test "Hide My Email" for the private-relay path).

- [ ] **Stable API hostname.** The quick trycloudflare URL rotates whenever the tunnel
  restarts, breaking `EXPO_PUBLIC_VERIBA_API_BASE_URL` and all stored image URLs.
  Move to a named Cloudflare tunnel / real domain before wider testing. *(Needs
  John's Cloudflare account.)*
- [ ] **Configure Resend** so follow-up emails actually send — the emailed web link is
  the approval path for patients without the app. *(Needs John's Resend API key.)*
  **Also required when doing this:** register the Resend sending domain + sender
  address with Apple as a "Sign in with Apple" email source (Apple Developer →
  Certificates, Identifiers & Profiles → Configure Sign in with Apple for Email
  Communication). Without it, Apple's private relay **silently drops** every
  follow-up email to Hide-My-Email members (their account email is a
  `@privaterelay.appleid.com` address). Push is unaffected — it targets the
  account id via the QR scan, verified working July 8 against a real relay account.
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

- [x] **Member QR + scan-linked followups.** DONE July 6 (backend `57c5c3f`,
  migration `0007`, 87/87 tests; frontend `b4b57e7`). Members show a "My
  clinic code" QR on Account; providers scan it in the wizard's patient-link
  form (expo-camera) or get an automatic match when typing a member's email —
  green badge with the member's name. `patient_user_id` beats email matching
  everywhere (approvals/results/push), and the member push moved from
  followup creation to **send time** with state-aware copy. Verified live:
  QR-bound followup with a deliberately wrong email still resolved to Mia and
  delivered "Time to add your after photo" to John's phone. (John: device
  needs one Xcode rebuild for the camera scanner.)

- [x] **Public page Phase 2 + blurhash.** DONE July 5 — backend `ae383e8`
  (migration `0005`: featured_session_id, services JSON, blurhash columns +
  backfill of 34 sessions & avatar, 56/56 tests) and app wiring: blurhash
  placeholders on every image surface (mosaic, search, saved, clinic grid,
  detail slider, my-results), services chips + FEATURED hero on the public
  clinic page, services persisted from the provider editor, and a
  pin/unpin-featured button on the published-session detail. Verified live:
  pin → alert → public page hero updates; unpin falls back to latest case.
  (Hide/reorder deliberately descoped — unpublish covers removal.)
- [x] **Phase 3 — growth layer.** DONE July 6 (backend `a99a434`, migration
  `0006`, 74/74 tests). Verified live end-to-end: member sent a consult request
  from the clinic-page chat bubble (email prefilled, duplicate correctly 409s),
  provider's Messages inbox received it and marked it handled; hours render
  collapsed ("Mon–Fri 9:00–17:00 · Sat 10:00–14:00") with Open-in-Maps;
  per-case saves + follower counts wired (save by member3 → saves_count 1
  confirmed).
- [x] **Provider reskin (P1/P2/P4).** DONE July 5 (`c458545`) — dashboard mosaic with
  status pills, Activity screen grouped by approval state (surfaces "needs
  obscuration" on blur-gated cases), Messages placeholder tab, account header
  restyle, 5-item provider tab bar. Bonus fix: rotated auth tokens now persist to
  SecureStore (was silently logging users out after ~30 min + reload).
- [x] **Multi-photo cases.** DONE July 6 — `photos[]` live (migration `0006`),
  two Woodbury triptychs seeded; verified: "Final" / "In progress" thumbnail
  strip swaps the slider's after side on the Jan-14 Lip Filler case.
- [x] **Approval push notifications.** LIVE July 6 — EAS project `prove-agence`
  linked, APNs key reused from John's Apple account, push entitlement in the
  build, verified on John's physical iPhone: real followup → "shared your
  results" banner, both on the lock screen and in-foreground
  (NotificationHandler added — iOS silently drops foreground pushes without
  one). Backend fixes (`1329983`): INFO logging for push attempts, resend
  path passed `db=None` and silently skipped push. Device builds must sign
  with the paid team (QUSDF5VAMQ), not the Personal Team — Personal Teams
  can't use the push entitlement.
- [x] **Haptics.** DONE July 5 — dev client rebuilt with expo-haptics (+
  expo-notifications); light impact on case-tile taps and when the compare slider
  crosses center. Feel it on device; simulator no-ops.

## Housekeeping

- [x] **Backend data pollution.** FIXED July 6 (backend `07150d6`) — Peanut's
  Palace deleted (6 sessions, 26 MinIO objects), all e2e tests now use
  " Demo"-suffixed practices caught by `delete_synthetic_records`, Atelier
  featured pin restored + auto-re-pinned by the seed, avatar back. Verified:
  public gallery is 18 Atelier + 6 " Demo" (client-filtered) sessions.
- [x] **Purge seeded fake `page_views`.** DONE July 6 (backend `15d5b1f`) —
  all seeded view counts zeroed in DB and removed from the seed script; the
  three concept " Demo" practices deleted too, so the public gallery is
  exactly Atelier's 18 real cases. Verified in-app: dashboard shows
  0 Profile Views; counts grow only from real public fetches now. Frontend
  placeholder sweep done (`82ddaed`): trending chips derive from live data,
  custody fallback honest, greeting clock-based, mock-feed.ts →
  feed-types.ts. The client-side " Demo" feed filter stays as a safety net
  against future e2e leaks.
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
