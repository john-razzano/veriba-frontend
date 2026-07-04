# Veriba — working TODO

State as of July 4, 2026: consumer mode is live end-to-end against the real backend
(Explore/Search/Saved/Inbox/Account, saves, follows, live search, in-app C4 consent
loop with credits). Frontend `d6072fe`, backend `2f47318`, DB at migration `0003`.
Test accounts: member `member2@veriba.app` / `supersecret1` · provider
`owner+atelier@veriba-demo.studio` / `veriba-demo-2026`.

## Now — correctness & security

- [ ] **Verify consent-tier rendering end-to-end.** A `full_blur` approval sets
  `obscure_mode` on the session, but confirm the *published web image* is actually
  re-processed (eyes blurred) — approving with blur must never publish an unblurred
  photo. Same question for `partial` (before must not be exposed by the gallery API).
  There's a completed `full_blur` test session in Atelier's ready-to-publish queue to
  test with. Touches backend `apply_consent`/image pipeline + app slider/tile rendering.
- [ ] **Check the production JWT secret.** Test runs warn the HMAC key is 9 bytes —
  that's the `change-me` default. Backend agent: confirm `.env` on the server sets a
  32+ byte `SECRET_KEY`; rotate if not.
- [ ] **Stable API hostname.** The quick trycloudflare URL rotates whenever the tunnel
  restarts, breaking `EXPO_PUBLIC_VERIBA_API_BASE_URL` and all stored image URLs. Move
  to a named Cloudflare tunnel / real domain before wider testing.
- [ ] **Configure Resend** (`RESEND_API_KEY` unset?) so follow-up emails actually send —
  the emailed web link is the approval path for patients without the app.

## Next — finish the consumer surface

- [ ] **Case detail: real metadata.** Wire `app/case/[id].tsx` to
  `GET /api/gallery/sessions/{id}` (already returns `treatment_details`, published
  date, provider name, custody checkpoints) and drop the hardcoded
  "Apr 14, 2026 / Dr. L. Okafor / 2 · hash-locked" card.
- [ ] **Explore filter chips.** "Lip filler / Botox / …" are visual-only; wire them to
  the gallery `category`/`query` params and derive the chip set from
  `available_categories`. Add pull-to-refresh + pagination (feed caps at 48).
- [ ] **Inbox "Earlier" activity.** Last mock text in the app. Needs a backend events
  feed (your result was viewed N times, clinic published your case, credit expiring)
  + `GET /api/me/activity`.
- [ ] **"My results" for members.** Account stat is hardcoded 0 and the "My before &
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
- [ ] **Per-practice demo removal.** `reset_demo_data.sh` nukes all demo spas together;
  add a `--slug` filter so Veriba Atelier can outlive (or be removed independently of)
  the three concept spas.

## Housekeeping

- [ ] Delete orphaned test user `member@veriba.app` (password unknown; superseded by
  `member2@veriba.app`) — one-liner for the backend agent.
- [ ] Two consented test sessions sit in Atelier's ready-to-publish queue (one full,
  one full_blur) — deliberately kept for testing the provider publish flow; publish or
  delete once used.
- [ ] Desktop: `verbia_real_before_after/split/` (the failed first-pass splits) can be
  deleted; `split-v2/` is canonical and also committed to the backend repo.
- [ ] `docs/veriba-archireum-mockup.html` + `docs/veriba-feed-explorations.html` are
  rejected design explorations — delete or keep as history.
