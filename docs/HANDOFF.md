# Session handoff — 2026-10-07

Read `CLAUDE.md` first (project rules), then `docs/API-GAPS.md` (open contract questions).

## Approved decisions (from the owner)
- Location `D:\React Native\OneTouchReview`, independent repo. Never modify other projects in `D:\React Native` (Wazigo may be *read* as an architecture reference).
- Expo SDK 57 (57.0.26) · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3 · npm only.
- Continuous Native Generation (`android/`, `ios/` generated + gitignored). Dev build only, never Expo Go.
- `src/api/network.ts` is the only axios importer (ESLint enforced).
- Token + `token_expires_at` in SecureStore only. AsyncStorage: selected location only.
- NO cached `/app-config` fallback, NO cached identity / offline authenticated bootstrap: cold start that can't reach the API → Retry screen. Once booted, offline never signs out.
- iOS push token type, Reverb auth/events, Google OAuth IDs: open questions — don't guess, don't install `@react-native-firebase/messaging`.
- Firebase files gitignored; EAS file env vars for cloud builds.
- Navigation: tabs Home / Clients / Send / Chats / More; bell + location switcher in header.
- Scope stops at Milestone 1: setup, auth (email code + password), `/auth/me`, roles, location switcher, Dashboard, Clients list/search/detail. Then report and wait.

## Done (commits on `main`, no remote)
1. `5989a5f` Project config: `app.config.ts` (com.onetouchreview.app, plugins: secure-store, notifications, nfc-manager, image-picker; Google plugin only when `GOOGLE_IOS_URL_SCHEME` set), `eas.json` (development/preview/production), ESLint guards, Jest.
2. `1e011f1` Network layer (bearer, Accept JSON, 401 → clear token + sign out, offline/5xx keep token, single-flight refresh < 30 days, 429 Retry-After, error normalization), tokenStorage, prefsStorage, Redux (session, auth, appConfig, location, network), bootstrap thunk, roles (`can()`).
3. `1618dec` Screens: sign-in (email code default), code (paste/autofill, resend timer, attempts left, "Send a new code"), password, forgot password, finish-on-web; blocking update-required / startup-error / suspended; tabs shell (Home/Clients/Send/Chats are placeholders), More (role + sign out), location picker; CLAUDE.md, README, docs/API-GAPS.md, `scripts/capture-responses.mjs`.
4. `6b496a0` Fixes: JS hard timeout per request + refresh (Android native timeout doesn't cover stalled DNS → app hung on blank screen); Google button showed because Expo serialized null extras as `{}`.

Checks: `npm run verify` (lint + typecheck + 69 tests) passes. `npx expo-doctor` 20/21 — only warning: `react-native-nfc-manager` "untested on New Architecture" (left visible until verified on a real device).

## Verified on Android emulator (Pixel_8_Pro_API_36)
- Native dev build compiles (6 min) with all native modules; installs; sign-in screen renders; Google hidden.
- Live API: `GET /app-config` 200; `POST /auth/login` 200 (token stored); `GET /locations` 200 → app then stops on "Locations response is not mapped yet" **by design** (`src/api/locations.api.ts` `parseLocations` throws until mapped from a real response).
- Emulator note: if requests hang, cold-boot it with `-no-snapshot-load -dns-server 8.8.8.8,1.1.1.1`.

## Not done / next steps
1. **Get real response shapes** (Sheet doesn't define them): `/auth/me`, `/locations`, `/business/dashboard`, `/analytics/usage`, `/customers`, `/customers/{id}`, `/customers/{id}/send-attempts`, `/review-requests?customer_id=&include_follow_ups=1`, `/auth/refresh`.
   - Preferred: test-business logins → `node scripts/capture-responses.mjs owner` / `staff` (owner types password; output in gitignored `.api-captures/`).
   - Test logins for "OneTouchReview Mobile Test" (business 99) were NOT yet provided.
   - The owner offered the web app (`app.onetouchreview.com`, a REAL customer business) for read-only viewing. Claude must not type its password; the owner signs in in the browser pane, then Claude only reads pages (and network calls for field names). No clicks that change data. Do not copy real customer data into code/tests/docs. Do not use that account in the mobile app or the capture script. The owner was asked to change that password (it was posted in chat).
   - Web dashboard (from owner's screenshot): "Your results" with 7/30/90-day toggle — Review requests sent, Review site clicks, New Google reviews, Google rating (+ "vs previous 30 days"), "You vs nearby rivals", "Recent activity"; header has "All locations" picker and bell. Mobile shows only what `/business/dashboard` returns.
2. Implement from real responses: `parseLocations` + `Location` type, `/auth/me` type check, Dashboard screen (`home.tsx`), Clients list (search, `not_sent`, cursor) + `clients/[id]` detail (history, send attempts, `next_request_allowed_at`, `last_not_sent`).
3. Verify Milestone 1: expo-doctor, lint, typecheck, tests; Android real phone; iPhone dev build (needs owner: `npx eas-cli login`, `npx eas-cli init`, `npx eas-cli device:create`, EAS file env vars — see README); owner + staff roles; Austin/Dallas switching; restart keeps location; 401 logs out; offline/5xx keeps token; other projects unchanged.
4. Report summary + open issues, then stop for review (no Phase 4+ until approved).

## Running locally
- Metro: `npx expo start --dev-client` (it was stopped by the 2-hour background limit).
- Emulator: `adb reverse tcp:8081 tcp:8081`, then open the "OneTouchReview" app (dev client) → localhost:8081.
- Rebuild native only when native deps / `app.config.ts` plugins change: `npx expo run:android`.

## Other notes
- Baseline check of sibling repos: only `Medhiwa-23_Advantage` changed during the session (owner's own commit + merge at 12:15–12:16 on 2026-10-06); Stech, thedemostop, Wazigo unchanged.
- App icons/splash are template placeholders — OTR brand assets not yet supplied.
- Sheet is view-only for Claude; "Done (date)" column must be filled by the owner or after edit access is granted.
