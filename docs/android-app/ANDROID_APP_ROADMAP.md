# Grace Android App Roadmap

## Goal

Turn Grace into a real Android app experience so users do not have to rely on TikTok, Facebook, or Instagram in-app browsers.

Grace Android should open full-screen, feel app-like, and point users directly into Grace Chat.

---

## Current Status

- Grace website works.
- Grace chat works.
- Marketplace Helper direction is active.
- PWA manifest exists.
- App icons exist.
- Service worker exists.
- Install page exists at `/install`.
- Android Chrome users can install Grace to their home screen.

---

## Phase 1: PWA Install Foundation

Completed:

- `app/manifest.ts`
- `public/sw.js`
- `components/RegisterServiceWorker.tsx`
- app icons in `public/icons`
- install instructions page at `/install`

Test:

1. Open Grace in Android Chrome.
2. Visit `/install`.
3. Tap Chrome three-dot menu.
4. Tap Install app or Add to Home Screen.
5. Open Grace from phone home screen.

---

## Phase 2: Google Play Android Wrapper

Recommended route:

- Trusted Web Activity
- Bubblewrap CLI
- Generate Android project from Grace manifest
- Build Android App Bundle `.aab`
- Upload to Google Play Console

Primary app URL:

https://grace-assistant.vercel.app/chat

Manifest URL:

https://grace-assistant.vercel.app/manifest.webmanifest

App name:

Grace

Short name:

Grace

Package name idea:

app.graceassistant.twa

---

## Phase 3: Required Google Play Assets

Needed before Play Store submission:

- App name
- Short description
- Full description
- App icon
- Feature graphic
- Screenshots
- Privacy policy URL
- Support email
- Content rating
- Data safety answers
- App category
- Closed testing plan if required

---

## Phase 4: Store Positioning

Main hook:

Grace helps buyers and sellers make smarter Marketplace decisions.

Buyer examples:

- Is this a good deal?
- What red flags do you see?
- What should I ask the seller?
- What should I offer?
- What is my walk-away price?

Seller examples:

- What should I list this for?
- Write my listing title.
- Write my description.
- What flaws should I disclose?
- How should I respond to buyers?
- What is a fair minimum price?

Other Grace features:

- Photo analysis
- Web search
- Reports
- PDFs
- Saved reports
- Voice
- Plans
- Checklists
- Everyday decision help

---

## Phase 5: Apple Later

Do Android first.

If Grace gets traction:

- Prepare iOS version.
- Apple app review may be stricter for web-wrapped apps.
- Build stronger native-feeling UI before submitting to Apple.
