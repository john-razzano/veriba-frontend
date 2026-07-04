# Veriba — working TODO

State as of July 4, 2026: consumer mode is live end-to-end against the real backend
(Explore/Search/Saved/Inbox/Account, saves, follows, live search, in-app C4 consent
loop with credits). Frontend `d6072fe`, backend `2f47318`, DB at migration `0003`.
Test accounts: member `member2@veriba.app` / `supersecret1` · provider
`owner+atelier@veriba-demo.studio` / `veriba-demo-2026`.

## Now — correctness & security

- [x] **Fix consent-tier privacy bugs.** FIXED July 4 (backend `18cc5f3`): partial
  consent no longer exposes `before_image_url`; `full_blur` sessions are gated from
  every publish path until pixels are actually obscured (blur tooling still a
  follow-up under Later). Original finding: Audited July 4:
  (a) `apply_consent` sets `obscure_mode` but nothing ever re-processes image pixels —
  no blur function exists in `services/images.py`, so a `full_blur` approval would
  publish the unblurred photo; (b) `serialize_public_session` returns
  `before_image_url` unconditionally — the seeded partial-consent session
  (Aster demo, "Jawline Definition Edit") exposes its before image in the public API
  today. Fix: null `before_image_url` when `consent_tier == partial`; restrict
  auto-publish/publish of `full_blur` sessions until obscuration is actually applied
  to pixels (provider-side tooling), + tests. Later: private bucket + signed URLs.
- [x] **Check the production JWT secret.** DONE July 4 — was the 9-byte default;
  rotated to 64-char random hex (all sessions invalidated once). Original: Test runs warn the HMAC key is 9 bytes —
  that's the `change-me` default. Backend agent: confirm `.env` on the server sets a
  32+ byte `SECRET_KEY`; rotate if not.
- [ ] **Stable API hostname.** The quick trycloudflare URL rotates whenever the tunnel
  restarts, breaking `EXPO_PUBLIC_VERIBA_API_BASE_URL` and all stored image URLs. Move
  to a named Cloudflare tunnel / real domain before wider testing.
- [ ] **Configure Resend** (`RESEND_API_KEY` unset?) so follow-up emails actually send —
  the emailed web link is the approval path for patients without the app.

## Next — finish the consumer surface

- [x] **Case detail: real metadata.** Done July 4 (`194703d`) — detail fetches the
  case study: published date, treatment details, checkpoint count, provider name.
- [x] **Explore filter chips + pull-to-refresh.** Done July 4 (`194703d`) — chips
  derive from live categories, client-side filter, pull-to-refresh. Pagination beyond
  48 still open.
- [ ] **Session restore after JS reload.** Metro reloads (and sometimes cold starts)
  land on the login screen even though tokens are in SecureStore — restoreSession
  isn't kicking in reliably. Annoying during dev, would log out real users on OTA
  updates.
- [ ] **Inbox "Earlier" activity.** Last mock text in the app. Needs a backend events
  feed (your result was viewed N times, clinic published your case, credit expiring)
  + `GET /api/me/activity`.
- [x] **"My results" for members.** DONE July 4 — backend `GET /api/me/results`
  (`18cc5f3`) + app screen/stat (`889e81d`). Original: Account stat is hardcoded 0 and the "My before &
  afters" menu is a stub. Backend: list sessions where `patient_email` matches the
  member (reuse the approvals matching); frontend: grid + stat.
- [ ] **Book consult.** Decide the MVP: open the practice website / prefilled contact
  request stored per practice? Currently an inert button on the case detail.

## Later — provider side & polish

- [ ] **Provider reskin (spec P1/P2/P4).** Dashboard mosaic with status pills, the
  Activity screen grouped by approval state, provider account restyle. The provider
  side still runs the pre-redesign UI.
- [ ] **Multi-photo cases.** Triptych source images produced `*_mid.jpg` extras
  (in backend `seed_assets/`, unseeded). Add `photos[]` to the case-study payload and
  a thumbnail strip on the detail that swaps the slider's after-side (angles/stages).
- [ ] **Approval push notifications** — a new followup should ping the member's phone,
  not wait to be discovered in Inbox.
- [ ] **Haptics** (`expo-haptics`, needs a dev-client rebuild): light impact on tile
  taps and when the compare slider crosses center.
- [ ] **Image loading polish**: blurhash placeholders computed at upload time, returned
  by the gallery API, used by `expo-image`.
- [x] **Per-practice demo removal.** DONE July 4 — `reset_demo_data.sh --slug <slug>`. `reset_demo_data.sh` nukes all demo spas together;
  add a `--slug` filter so Veriba Atelier can outlive (or be removed independently of)
  the three concept spas.

## Housekeeping

- [x] Deleted orphaned test user `member@veriba.app` (password unknown; superseded by
  `member2@veriba.app`) — one-liner for the backend agent.
- [ ] Two consented test sessions sit in Atelier's ready-to-publish queue (one full,
  one full_blur) — deliberately kept for testing the provider publish flow; publish or
  delete once used.
- [ ] Desktop: `verbia_real_before_after/split/` (the failed first-pass splits) can be
  deleted; `split-v2/` is canonical and also committed to the backend repo.
- [ ] `docs/veriba-archireum-mockup.html` + `docs/veriba-feed-explorations.html` are
  rejected design explorations — delete or keep as history.
