# CLAUDE.md — OneTouchReview mobile app

## What this is
React Native + Expo (TypeScript) app for OneTouchReview business owners and staff.
- Project folder: `D:\React Native\OneTouchReview` — an independent repo. Never modify other projects under `D:\React Native`.
- API: `https://api.onetouchreview.com/api/v1` (JSON, `Accept: application/json`, `Authorization: Bearer TOKEN`). The API is the only backend.
- Sources of truth (Version 2, October 5, 2026 supersedes Version 1):
  - Build guide: "OneTouchReview mobile app — build guide" (Google Doc)
  - API reference: "OneTouchReview mobile app — API reference" (Google Sheet: Start here, Endpoints, Errors, Push, Notifications, Screen checklist)
- App ID (iOS bundle + Android package): `com.onetouchreview.app`. Firebase project: `onetouchreview-41693`.

## Rules
- Only call endpoints listed in the Sheet. Never invent endpoints, fields or response shapes.
  Types in `src/api/types.ts` come from the Sheet or a captured test-business response (`scripts/capture-responses.mjs`).
- If the API differs from the Sheet: do NOT work around it in the app. Record it in `docs/API-GAPS.md`
  with endpoint, request, exact curl, expected, actual, HTTP status, error code, and what needs fixing server-side.
- Expo Development Build only (NFC needs native code). Never Expo Go. CNG: `android/` and `ios/` are generated and gitignored.
- npm only (`package-lock.json`). Add/upgrade native packages with `npx expo install` / `npx expo install --fix`, never by hand.

### Architecture
- `src/api/network.ts` is the ONLY file that imports axios (ESLint enforced). API modules (`src/api/*.api.ts`) call `network`; screens call API modules or hooks, never axios.
- Token + `token_expires_at`: `expo-secure-store` via `src/services/storage/tokenStorage.ts` only.
- AsyncStorage: `src/services/storage/prefsStorage.ts` only, and only approved harmless preferences (currently: selected location). Never tokens, passwords, codes, Google tokens, user/business profiles or client data. Never persist the whole Redux store.
- Redux Toolkit holds global state only (session, auth, appConfig, location, network). Screen data lives in screen hooks/local state.
- NetInfo feeds `network.setOnline` and the `network` slice.
- No cached `/app-config` and no cached identity: a cold start that can't reach the API shows Retry. Once booted, losing connection never signs out.

### Errors and session
- Errors are `{ error: { code, message, details } }`: show `message`, branch on `code` (never on message text).
- 401 → clear token, back to sign-in. Offline / 5xx → keep token, show Retry.
- 403 FORBIDDEN → hide by role first; if it still happens say "Ask the owner". 403 BUSINESS_SUSPENDED → full-screen message.
- VALIDATION_FAILED → show `details[field]` under the field. 429 → respect `Retry-After` / `details.retry_after`.
- SUBSCRIPTION_REQUIRED → "Open OneTouchReview on the web to continue". No billing, prices, plans or billing links anywhere.
- Token refresh: `POST /auth/refresh` when < 30 days remain; single-flight; old token valid 60 s.

### Product rules
- Roles from `/auth/me` `user.role` (owner/manager/staff): use `can()` in `src/config/permissions.ts`; server 403 is still authoritative.
- Adding a client with a phone needs the consent tick ("This client agreed to receive texts from us"); never pre-tick; send `consent_confirmed: true` only after explicit confirmation. Email-only clients: no tick, no consent fields.
- Send a new UUID `client_id` (expo-crypto `randomUUID`) with chat replies and Resend; reuse it when retrying the same operation.
- Push: expo-notifications; `POST /devices` after permission (asked after sign-in), once per token. `fcm_token` is an FCM registration token on both platforms (API-GAPS #1, answered 2026-10-08): Android uses the native token; iOS needs Firebase Messaging `getToken()`, never the raw APNs token. Not built yet: adding `@react-native-firebase/messaging` (via `npx expo install`) needs the owner's OK first.
- Realtime: Laravel Reverb via Pusher protocol (API-GAPS #2, answered 2026-10-08). Config from `/app-config` `reverb`; channel `private-business.{id}.chats`; events `chat.message` `{ chat_id, message }` and `chat.updated` `{ chat_id }` (re-fetch the chat). Auth is `POST /broadcasting/auth`, which is NOT in the Sheet yet: don't build realtime until it's added. App must keep working without realtime (refresh on focus / polling).
- NFC: react-native-nfc-manager, NDEF URI record with `short_url`; always cancel the technology request. No phone-to-phone NFC sharing.
- Never log tokens, passwords, codes, Google tokens or client content. Never commit secrets, test logins, keystores, `google-services.json` or `GoogleService-Info.plist`.

### Design
- Owner's mockups are a style guide, not a spec: apply them only where the app has the data and the Sheet has the endpoint. Never invent data, fields or actions for a mockup element (left out so far: charts, trends, list counts, per-star bars, WhatsApp, Apple sign-in, in-app sign-up, Contact support).
- Colours, radius and shadow come from `src/constants/theme.ts` only (brand teal `#018F7C`, gold `#FBB10A`, navy text `#0B1F3A`). No hard-coded colours in screens.
- Reuse `src/components/ui/` (Avatar, IconTile, Brand, AuthHeader, Button/TextField `icon`, EmptyState `icon`, Card) before writing new components.
- Light theme only. The one dark surface is the launch screen; its `LAUNCH_COLORS.top` must match the native splash `backgroundColor` in `app.config.ts`.
- Owner decisions: no quick actions on Home; Send is the raised centre tab.
- Brand images live in `assets/images/` (generated from the owner's logo files). Icon / splash / `app.config.ts` changes need `npx expo prebuild --platform android --clean` before rebuilding.
- Mockups contain real names: never copy them into code, tests, docs or commits.
- Check visual changes on the emulator (read-only screens only while it is on a real business).

### Test business only
"OneTouchReview Mobile Test" (business 99; locations Austin 1497, Dallas 1498). Texts are in log mode.
NEVER add a postal address (real emails could go out). Only sample clients, 555-01xx phones, example.com emails. Never sign in to a real customer's business.

## Workflow
- Small commits. Before each commit: `npm run lint`, `npm run typecheck`, `npm test` (or `npm run verify`).
- A screen is Done only after it is verified on an Android phone and a real iPhone development build against the Sheet's Screen checklist.
- Stop after each agreed milestone for review.
