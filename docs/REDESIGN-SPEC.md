# Veriba app redesign — implementation spec

This document is the handoff brief for implementing the Instagram-inspired redesign and the
merge of the **consumer-facing** experience into the existing **provider** app. It is written
to be read by an engineer or by Claude Code.

---

## Status (July 2026)

Built and live against the real backend:

- **Auth**: role selector on signup (member vs clinic); backend `role=member` accounts
  with no practice. Role-aware tabs: members get Explore · Search · Inbox · Saved · Account.
- **C1 Explore**: 3-column IG-style mosaic (2×2 auto-reveal hero per block of 6, bare small
  tiles), slowed reveals, muted befores, expo-image caching. **Live data** — the feed reads
  `GET /api/gallery/sessions` via `src/lib/gallery.ts` (in-memory session cache).
- **C2 Case detail**: drag slider (swipe-back disabled on this screen), custody strip;
  resolves cases from the gallery cache.
- **C6 Search / C7 Saved / C3 Inbox**: browse-by-treatment buckets, clinic lists, saved
  grid, and the approval card all derive from live gallery data. Saves/follows/approvals
  APIs don't exist yet (§7) — those interactions are still visual stand-ins.
- **Placeholder imagery is gone**: the pravatar mock feed was removed; `src/data/mock-feed.ts`
  now holds only shared types, trending-treatment labels, and text-only inbox activity.
  Real photography is seeded server-side as the **Veriba Atelier** practice
  (18 published cases — see `DEMO-DATA.md` in the backend repo for accounts and removal).

Not built yet: C4 review-and-approve (consent tiers), saves/follows persistence, search
API, provider-side reskin (P1/P2/P4), shared-element feed→detail transition.

**Visual reference:** `docs/veriba-app-mockup.html` (open in a browser). It contains all 11
target screens for both modes. Drag the white handle on the post/approval before-afters; the
discovery feed tiles auto-animate the before→after reveal.

---

## 1. Goal

Today the app is **provider-only**: a practice captures a before/after session, records consent,
and publishes it (`app/(tabs)/index.tsx` is a stats dashboard + a text list of sessions). We are:

1. Reskinning it in an Instagram-style, photo-forward visual language.
2. Adding a **consumer mode** in the *same* Expo codebase. Login role decides which UI renders.
   Consumers browse a discovery feed of verified before/afters and approve their own results.

One codebase, one auth, shared theme + data model + before/after comparison component.

---

## 2. What already exists (reuse, don't rebuild)

- **Routing:** Expo Router. Tabs in `app/(tabs)/_layout.tsx` (`index`, `new`, `account`),
  detail at `app/session/[id].tsx`, capture flow under `app/wizard/*`, auth under `app/(auth)/*`.
- **State:** `src/store/prove-store.ts` (zustand). Already has `user`, `practice`, `sessions`,
  auth, `bootstrap`, `refreshSessions`, consent + follow-up actions.
- **Types:** `src/types.ts`. Note `User.role`, `PhotoSubmittedBy = 'provider' | 'patient'`,
  `ConsentTier = 'full' | 'partial' | 'full_blur' | 'decline'`, `FollowUpRequest` (the existing
  patient web-link approval flow: `status`, `uploadUrl`, `uploadToken`, `patientEmail`, …),
  `Session` (`beforePhotoUri`, `afterPhotoUri`, `photos[]`, `obscureMode`, `obscureRegion`).
- **Theme:** `src/theme.ts` — `colors` (copper `#B5672D`, teal `#2D4F5E`, brown, neutrals),
  `fonts` (display = Cormorant Garamond, body = DM Sans), `spacing`, `radii`, `shadows`,
  `gradients`. The mockup uses exactly these tokens.
- **UI components:** `src/components/ui.tsx` (`StatCard`, `StatusPill`, `SectionCard`,
  `GradientButton`, `OutlineButton`, `ChipButton`, …) and `src/components/photo-preview.tsx`
  (`ProgressionCarouselCard`, `VerifiedBadge`, `PhotoPairCard`, `PhotoSlot`). The detail screen
  already renders before/after via `ProgressionCarouselCard` — upgrade this, don't replace it.
- **API layer:** `src/lib/veriba-api`.

## 3. Dependencies to add

- **`react-native-gesture-handler`** — required for the draggable before/after slider on the
  post-detail and approval screens (`reanimated` 4 is already installed; the slider should be a
  reanimated + gesture-handler component). The discovery-feed auto-reveal needs **no** gesture
  lib — it's a looping reanimated/timeline animation, so it can ship first without this dep.
- Optional: `@shopify/flash-list` for the discovery feed grid performance (recommended but not
  required for v1).

---

## 4. Information architecture

Role-aware tab layout in `app/(tabs)/_layout.tsx`, branching on `user.role`. Both bars have an
**odd** number of items (5).

**Consumer tabs:** Home (discovery) · Search · **Inbox** (centre) · Saved · Account.
No create button — consumers don't author posts.

**Provider tabs:** Home (dashboard) · Activity · **＋ Create** (centre, prominent) · Messages · Account.

A lightweight **mode toggle** (not separate profiles): provider Account has "View as a member";
consumer Account has "Switch to clinic mode" (only shown if the account is provider-eligible).

---

## 5. Screen-by-screen spec

Numbers match the mockup captions.

### Consumer
- **C1 Discovery feed** → replaces the body of `app/(tabs)/index.tsx` for consumers (or a new
  `app/(tabs)/index` branch). Edge-to-edge **mosaic** grid, mixed tile sizes, ~2px gutters.
  Tiles lead with the *after* image + serif-italic treatment label + uppercase clinic label.
  **At most one tile per row auto-animates** the before→after reveal (looping wipe). Floating
  serif "Veriba · Explore" header + slim filter chips. Tap a tile → C2.
- **C2 Post detail** → restyle `app/session/[id].tsx`. Full-bleed image at top with a **draggable
  before/after slider** (upgrade `ProgressionCarouselCard`), clinic row, treatment title,
  chain-of-custody strip (Captured · Consented · Verified), info card, Save / Book CTAs.
- **C3 Inbox** → new route (e.g. `app/(tabs)/inbox.tsx`). "Needs your review" card(s) driven by
  pending `FollowUpRequest`/approval records, plus an activity list. Tap review → C4.
- **C4 Review & approve** → new route. Before/after preview + four options that map **directly**
  to `ConsentTier`: full → `full`, blur eyes → `full_blur`, after only → `partial`, decline →
  `decline`. Confirm calls the existing `recordConsent` / `declineConsent` store actions.
- **C5 Account** → consumer variant of `app/(tabs)/account.tsx`: results/saved/following stats,
  menu (My before & afters, Saved clinics, Privacy & consent, Settings), "Switch to clinic" card.
- **C6 Search** → new route. Search bar, trending treatments, browse-by-treatment mosaic, top
  clinics list.
- **C7 Saved** → new route. Cases / Clinics segmented toggle + grid of bookmarked before/afters.

### Provider
- **P1 Dashboard** → restyle `app/(tabs)/index.tsx` (provider branch). Keep `StatCard` row; render
  the practice's own `sessions` as the same mosaic with `StatusPill` overlays.
- **P2 Activity** → new route. `sessions` grouped by approval state using existing
  `FollowUpRequestStatus` / `SessionStatus` (Waiting on patient · Approved/ready · Live).
- **P3 Create (＋)** → existing `app/(tabs)/new.tsx` + `app/wizard/*` flow, restyled.
- **P4 Account** → provider variant: practice profile, services, verification & consent,
  "View as a member" toggle.

---

## 6. New shared components to build

- `BeforeAfterSlider` — draggable (gesture-handler + reanimated). Props: `beforeUri`, `afterUri`,
  optional `obscuration`. Used in C2 and C4.
- `AutoRevealTile` — looping before→after wipe for the feed (reanimated timeline, respects
  `reduce-motion`). Props: `beforeUri`, `afterUri`, `treatment`, `clinic`, `delay`.
- `MosaicFeed` — lays out tiles in the mixed-size rhythm, ensuring ≤1 animated tile per row.
- `CaseTile` — static after-forward tile with label + verified mark (used in feed, search, saved).
- `RoleTabs` — the role-aware tab bar logic.

Honor `Session.obscureMode` / `obscureRegion` everywhere a face is shown (masking already in the
data model and `PhotoOverlayEditorSurface`).

---

## 7. Backend / API gaps to confirm (flag, don't guess)

The redesign assumes data the provider-only API may not expose yet. Confirm or stub:

1. **Consumer role + auth** — accounts that are patients, not practices.
2. **Discovery feed endpoint** — cross-clinic list of *published, full-consent* cases (the feed
   must only surface consented-public results).
3. **Approval surface for the patient in-app** — today approval is an emailed `uploadUrl`/token.
   The Inbox/Review screens need the same records queryable per logged-in patient (match by
   `patientEmail`). Keep the web link as the fallback for patients without the app.
4. **Saves / follows** — saved cases, saved/followed clinics.
5. Search index for treatments/clinics/location.

Until these exist, build screens against typed mock data in the store so UI work isn't blocked.

---

## 8. Phased plan

**Phase 0 — Foundations.** Confirm `src/theme.ts` covers the mockup; add serif-label + mosaic
styles. Build `CaseTile`, `MosaicFeed`, `AutoRevealTile` against mock data. No new deps.

**Phase 1 — Discovery feed + post detail (consumer reskin).** Implement C1 over mock/real feed
data. Add `react-native-gesture-handler`; build `BeforeAfterSlider`; upgrade `app/session/[id].tsx`
(C2). This is the highest-visual-impact, lowest-risk slice.

**Phase 2 — Role-aware shell.** Branch `app/(tabs)/_layout.tsx` on `user.role`; add the 5-item
consumer/provider bars and the mode toggle. Add Search (C6) and Saved (C7).

**Phase 3 — Approval loop.** Inbox (C3) + Review/approve (C4) wired to `recordConsent` /
`declineConsent` and the follow-up/approval records. Provider Activity (P2).

**Phase 4 — Provider reskin.** Dashboard mosaic (P1), restyle Create (P3) and both Accounts.

**Phase 5 — Polish.** reduce-motion handling, FlashList, empty/loading states, obscuration in
the feed, accessibility.

Each phase should compile and be demoable on its own.

---

## 9. Acceptance checks per phase

- TypeScript passes, app builds on iOS + Android.
- New screens match `docs/veriba-app-mockup.html` within the existing theme tokens.
- Before/after: feed = auto-reveal (no drag); post/approval = drag slider.
- Consent choices persist via existing store actions.
- No raw colors/fonts — everything from `src/theme.ts`.
