# Session handoff — 2026-10-07 (updated end of day)

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
- Scope: Milestone 1 = setup, auth (email code + password), `/auth/me`, roles, location switcher, Dashboard, Clients list/search/detail. The owner also asked for Resend (done). Then report and wait.

## Repository
- GitHub: https://github.com/dev-saman/OneTouchReview-Mobile (**public**), branch `main`, pushed and in sync.
- History was rewritten once (2026-10-07) to remove a real business name from this file; old commits `fa2e721` / `d1f9889` are gone from `main`.

## Done (commits on `main`)
1. `5989a5f` Project config: `app.config.ts` (com.onetouchreview.app, plugins: secure-store, notifications, nfc-manager, image-picker; Google plugin only when `GOOGLE_IOS_URL_SCHEME` set), `eas.json` (development/preview/production), ESLint guards, Jest.
2. `1e011f1` Network layer (bearer, Accept JSON, 401 → clear token + sign out, offline/5xx keep token, single-flight refresh < 30 days, 429 Retry-After, error normalization), tokenStorage, prefsStorage, Redux (session, auth, appConfig, location, network), bootstrap thunk, roles (`can()`).
3. `1618dec` Screens: sign-in (email code default), code, password, forgot password, finish-on-web; blocking update-required / startup-error / suspended; tabs shell, More (role + sign out), location picker; CLAUDE.md, README, docs/API-GAPS.md, `scripts/capture-responses.mjs`.
4. `6b496a0` Fixes: JS hard timeout per request + refresh; Google button hidden when unconfigured.
5. `d2c9889` This handoff file.
6. `3483995` Show/hide (eye) toggle on every password field (`TextField` with `secureTextEntry`).
7. `fcfea65` `/locations` mapped from the Sheet response example (`{ locations: [{ id, name, … }] }` → `{ id, name }`); `/app-config` `reverb` may be `null`.
8. `0cbbe4e` Dashboard (Home), Clients list, client detail:
   - Home: stats for the chosen location, activity vs the previous period (`/analytics/usage`), urgent feedback banner, recent requests (tap → client). Plan/trial/subscription fields are ignored (no billing in the app). Average rating shows "—" when there are no responses (API sends 0).
   - Clients: search (debounced), All / Not sent, cursor paging (`next_cursor` / `has_more`), pull to refresh.
   - Client detail `src/app/(app)/client/[id].tsx`: contact (tap to call/email), text consent, "Can be asked again on …", latest response, Not sent reasons (send-attempts), request history with Load more.
   - Shared: `useApiQuery(key, fetcher)` (keyed loads, cancels stale requests), `useRefreshOnFocus` (focus + foreground), `useDebouncedValue`, `utils/format.ts`, `components/ui/Card.tsx`, `features/clients/RequestRow.tsx`.
9. `2bc4a65` Resend link (owners/managers, only when `can_resend`): confirm "Only if the client asked for it"; `client_id` UUID reused on retry after offline/timeout/5xx, replaced after success or a refusal; refusals show the server message and reload.

Checks: lint + typecheck + **84 tests** pass.

## Where the response shapes come from
- The owner added a **"Response example (HTTP status + JSON)"** column to the Sheet's Endpoints tab for every endpoint (2026-10-07). Types in `src/api/types.ts` are built from it, keeping only fields the screens use.
- The capture script is no longer required for Milestone 1 (still useful to confirm against the test business). API-GAPS #10 is answered; new open items #14–#17 (last_not_sent fields, non-empty send-attempts example, follow-ups in history, avg_rating 0 vs null).

## Verified on Android emulator (Medium_Phone_API_36)
- Sign-in, startup (`/app-config`, `/auth/me`, `/locations` all 200), Home dashboard with live numbers, Clients empty state.
- **NOT verified:** client detail, Not sent with results, paging, Resend, owner vs staff, Austin/Dallas switching — all need the test business.
- ⚠️ The emulator was signed in with an account that belongs to a **real business** (0 clients), not the test business. Sign out and use only the "OneTouchReview Mobile Test" (business 99) logins. Never press Resend on a real business — texts are real there. The Sheet's "Start here" still says the test logins are "added when the test business is ready".

## Next steps
1. Get the test-business owner + staff logins; sign out of the real account on the emulator.
2. Verify on the test business: client detail, Not sent, paging, Resend (owner), Resend hidden for staff, Austin/Dallas switching, location kept after restart, 401 → sign-in, offline/5xx keeps the session.
3. iPhone dev build (needs owner: `npx eas-cli login`, `npx eas-cli init`, `npx eas-cli device:create`, EAS file env vars — see README) and an Android real phone.
4. Fill the Sheet's "Done (date)" column (owner — Claude has view-only access).
5. Report and stop for review (no Phase 4+ until approved).

## Running locally
- Metro: `npx expo start --dev-client` (port 8081). Only one Metro at a time; a second one starts on 8082 and the app won't use it.
- Emulator: `adb reverse tcp:8081 tcp:8081`, then open the app (dev client) → localhost:8081.
- **Emulator networking is flaky.** If the app shows "You're offline" / "That took too long" while the PC is online, restart the emulator with
  `emulator -avd Medium_Phone_API_36 -dns-server 8.8.8.8 -no-snapshot-load`. It happened twice today.
- Rebuild native only when native deps / `app.config.ts` plugins change: `npx expo run:android` (about 1–2 min incremental).
- `expo` 57.0.27 and 5 other package updates are available — not applied (do it as a separate change with `npx expo install --fix`).

## Other notes
- Baseline check of sibling repos (2026-10-06): only `Medhiwa-23_Advantage` changed (owner's own commit + merge); Stech, thedemostop, Wazigo unchanged.
- App icons/splash are template placeholders — OTR brand assets not yet supplied.
- Windows PowerShell: commit messages containing double quotes break `git commit -m`; use `git commit -F <file>`.
