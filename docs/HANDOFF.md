# Session handoff — 2026-10-12

Read `CLAUDE.md` first (project rules), then `docs/API-GAPS.md` (contract questions and the API team's answers).

## Since 2026-10-07
- **2026-10-08:** the API team answered almost every API-GAPS question (doc "OneTouchReview mobile app — answers to open API questions"). Recorded in `docs/API-GAPS.md` (`2bc4841`). See "API questions" below for what that unblocks.
- **2026-10-12:** fixed the double `POST /devices` on every start (`83ea2f7`, see Gotchas). 130 tests pass.
- **2026-10-12:** brand redesign from the owner's mockups and logo files: teal/gold theme, logo in headers, icon tiles, avatars, empty-state icons, new app icon / adaptive icon / notification icon / splash, and a branded launch screen while startup runs. Mockup parts without API data (charts, call buttons, list counts) and a dark mode were left out on purpose.
- **2026-10-12:** the launch screen is now the dark brand splash (owner's choice of the three mockups); native splash background `#0A2A3A`.
- **2026-10-12:** the emulator showed only the splash screen while the app ran fine underneath (the system splash layer's exit animation was stuck). A cold boot fixed it — not an app bug. See "Running locally".

## Status in one paragraph
Every screen in the build guide (Version 2) now exists in code: sign-in, Profile, signed-in devices, Send, Push (Android), Reviews, Private feedback, Chats, Dashboard, My card, Clients, location switcher, Edit card, Reports, Ask AI and the notifications bell. Lint, typecheck and **130 tests** pass. **None of it has been verified on the test business, a real Android phone or an iPhone yet** — the emulator was only ever signed in to real customer accounts, so anything that writes (sending, resending, replying, posting, editing, Ask AI, allowing push) was deliberately not exercised. That verification is the next job.

## Approved decisions (from the owner)
- Location `D:\React Native\OneTouchReview`, independent repo. Never modify other projects in `D:\React Native` (Wazigo may be *read* as an architecture reference).
- Expo SDK 57 (57.0.27) · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3 · npm only.
- Continuous Native Generation (`android/`, `ios/` generated + gitignored). Dev build only, never Expo Go.
- Token + `token_expires_at` in SecureStore only. AsyncStorage: selected location only.
- NO cached `/app-config` fallback, NO cached identity: a cold start that can't reach the API → Retry screen. Once booted, offline never signs out.
- iOS push token type and Reverb auth/events were answered 2026-10-08 (API-GAPS #1, #2), but nothing is built yet: iOS push needs `@react-native-firebase/messaging` (ask the owner before adding it); realtime waits until `POST /broadcasting/auth` is in the Sheet. Google OAuth IDs (#12) are still in progress.
- Firebase files gitignored (present locally); EAS file env vars for cloud builds.
- Navigation: tabs Home / Clients / Send / Chats / More; bell + location switcher in the header. Feedback, Reviews, My card, Reports, Ask AI, Notification settings and Profile open from More.
- The owner asks for a build step, then a commit and push after each one.

## Repository
- GitHub: https://github.com/dev-saman/OneTouchReview-Mobile (**public**), branch `main`, pushed and in sync.
- Because it's public: **never put real business, client or person names in code, tests, docs or commit messages.** History was rewritten and force-pushed twice on 2026-10-07 to remove real business names; no real names remain anywhere in history (checked with `git log --all -S <name>`). The second rewrite changed every commit ID from "Update handoff notes with today's progress" onward; the IDs below are the current ones.
- Commit `825d096`'s message starts with an invisible BOM (written with PowerShell `Set-Content -Encoding utf8`). Cosmetic; left as is. Write commit message files with the editor tool and `git commit -F`, never `-m` with quotes and never `Set-Content`.

## Architecture guards (ESLint `no-restricted-imports`)
One module owns each sensitive dependency:
- `axios` → `src/api/network.ts` · `expo-secure-store` → `src/services/storage/tokenStorage.ts` · AsyncStorage → `src/services/storage/prefsStorage.ts`
- `react-native-nfc-manager` → `src/services/nfc/nfc.ts` (always cancels the technology request — tested)
- `expo-notifications` → `src/services/push/push.ts` (also sets the app icon badge)

Shared building blocks: `useApiQuery(key, fetcher)` (keyed loads, stale requests cancelled), `usePagedList` (page numbers or `next_cursor`), `useRefreshOnFocus`, `useDebouncedValue`, `utils/format.ts`, `components/ui/*` (Card, Badge, InfoRow, Chips, Stars, Checkbox, ListFooter, TextField with eye toggle).

## Done (commits on `main`, oldest first)
| Commit | What |
|---|---|
| `5989a5f` `1e011f1` `1618dec` `6b496a0` | Setup, network layer, session/bootstrap, sign-in screens, tab shell (see CLAUDE.md / README) |
| `3483995` | Show/hide toggle on password fields |
| `fcfea65` | `/locations` mapped from the Sheet response example |
| `0cbbe4e` | Dashboard, Clients list, client detail |
| `2bc4a65` | Resend (owners/managers, `client_id` reused on retry) |
| `c10cba5` | Expo SDK 57 patch updates (`npx expo install --fix`) |
| `bdeb5b7` | Profile: confirm email, set/change/remove password, reminder, change email |
| `ef6d951` | Send a review request: existing client or add-and-send, consent tick rules (tested), refusals in plain words |
| `eea42af` | Notifications bell + app icon badge (count in a React context, not Redux) |
| `2a88e3c` | Private feedback, Google reviews (AI draft, reply coach, post/edit/delete); **fixed the Profile link** |
| `5e8361b` | Chats inbox + chat screen (`client_id` outbox, mark done/reopen) |
| `8aa422f` | My card: QR from `short_url`, share, write NFC tag |
| `825d096` | Edit card (changed fields only; photo → JPEG ≤ 1200 px, upload) |
| `f28743d` | Reports (likes/dislikes, insights, weekly report) and Ask AI |
| `3b11bf9` | Signed-in devices |
| `b2a5a0f` | Push (Android) + Notification settings |
| `83ea2f7` | Register the push token once per session (`registerDevice.ts`) |
| `2bc4841` | API-GAPS: the API team's 2026-10-08 answers |

## Where the response shapes come from
- The Sheet's Endpoints tab has a **"Response example"** column (column G) for all 64 endpoints. Types in `src/api/types.ts` keep only fields the screens use.
- The examples are real API output from a temporary **local** test database with made-up data — not production, not the test business. Field names are reliable; behaviour on production still needs checking. Fields that are always `null` / `[]` in the examples are treated as unknown and are API-GAPS questions, never guessed.
- To download the Sheet as CSV (it's viewable without login): `https://docs.google.com/spreadsheets/d/1STt5_YC5VnGGG1kSNTDaDmQm6VZidxcZhFdSpbq7vc0/gviz/tq?tqx=out:csv&sheet=Endpoints`
- The build guide (Google Doc) exports as text: `https://docs.google.com/document/d/1VciMlI4NrYcgis-KnXNOqYjhWpglZyVSppm6TDSdhoE/export?format=txt`

## Gotchas
- **Metro stopped answering after Android builds** (blank app, Metro at 100% CPU, `/status` times out). Gradle writes ~7,000 files under `node_modules/*/android/build`, and without Watchman Metro kept reprocessing them. `metro.config.js` now block-lists native build output (2026-10-12); after a full `prebuild --clean` + build, Metro kept answering. If it hangs anyway: stop it and run `npx expo start --dev-client`.
- **Don't let the app connect to `192.168.1.108:8081`.** `expo run:android` opens the dev client with the PC's Wi-Fi address, which this PC blocks (likely Windows Firewall), so the app stays blank. Use the adb tunnel instead: `adb reverse tcp:8081 tcp:8081`, then open `exp+onetouchreview://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` once; later icon launches remember it.
- **`expo run:android` reuses an existing `android/` folder**, so changes to icons, splash, colours or `app.config.ts` don't reach the build (2026-10-12: the notification colour stayed the old blue). Regenerate first with `npx expo prebuild --platform android --clean` (safe: `android/` is generated and gitignored), then `npx expo run:android --no-bundler`.
- **Push token fired twice:** in expo-notifications, fetching the device token also fires the token-change listener with the same token. `registerDevice()` skips a token already registered or in flight, retries after a failure and resets when PushManager unmounts on sign-out.
- **Expo Router index routes:** the generated types name `folder/index.tsx` as `/folder/index`, which does **not** resolve at runtime ("Unmatched Route"). Use `folder.tsx` next to `folder/` instead (as `profile.tsx`, `feedback.tsx`, `reviews.tsx`, `card.tsx` do).
- **Route types lag behind new files.** If typecheck rejects a new route, touch the file (or reload the app) so Metro regenerates `.expo/types/router.d.ts`.
- **Android push permission:** "never asked" reports as `denied` + `canAskAgain: true` (iOS reports `undetermined`). PushManager asks when not granted and `canAskAgain`.
- **ESLint `react-hooks/set-state-in-effect`:** don't call a function that sets state at the top of an effect; start the request and set state in `.then` (see `useApiQuery`, `BadgeProvider`).

## Verified on the Android emulator (Medium_Phone_API_36)
- Startup, sign-in, Home dashboard with live numbers, Clients (empty state), Send form (consent tick appears unticked; nothing sent), bell count, More menu (role-based rows, Ask AI shown via `/ai/status`), Profile, Signed-in devices, My card (QR renders), Edit card (form loads; nothing saved), push permission prompt after sign-in (not answered).
- **Not verified anywhere yet:** client detail with data, Not sent, paging, Resend, Send for real, chats, feedback, reviews/replies, Ask AI answers, reports content, NFC writing (needs a real phone), photo upload, push delivery and taps, owner vs staff, Austin/Dallas switching, 401 → sign-in, offline/5xx keeps the session.
- ⚠️ The emulator is still signed in to a **real customer business**, not the test business (still true on 2026-10-12). Push permission was granted there, so the emulator is registered for push on that real account. Remove it under Profile → Signed-in devices (or sign out), and use only the "OneTouchReview Mobile Test" (business 99) logins. Never send, resend, reply, post, edit cards, ask AI or allow push on a real business.

## API questions
`docs/API-GAPS.md` has 28 items. All are answered except #12 (Google OAuth, in progress). Where they leave the app:
- **Ready to build** (answer is enough, endpoints are in the Sheet):
  - #23 chat Assign: `PATCH /chats/{id}` `{ assigned_user_id }` (`null` unassigns).
  - #27 Ask AI history: turns `{ role, content }`, max 6; plus `links` and `follow_ups` shapes.
  - #21 urgent badge on feedback: top-level `urgent`.
  - #18 friendly text for `warning` `DAILY_LIMIT_NEAR` / `DAILY_LIMIT_REACHED`.
  - #13 web link `https://app.onetouchreview.com` on the "Open on the web" messages.
  - #11 `POST /auth/logout` with the new-user token after Google sign-in.
  - #22 review status filters `no-reply` / `negative` / `ai-draft` and the `ai_reply` draft shape.
  - #28 insights themes / staff / locations shapes.
- **Answered but blocked:**
  - #1 iOS push: needs an FCM token from Firebase Messaging; owner OK needed to add `@react-native-firebase/messaging`.
  - #2 Reverb realtime: `POST /broadcasting/auth` isn't in the Sheet yet; ask for it to be added. Chats keep refreshing on focus / foreground / pull.
  - #26 business card address: `PUT /digital-cards/slug` isn't in the Sheet yet.
  - #25 "my card": no field yet (the API team will add one).
- **In progress:** #12 Google OAuth clients: we send SHA-1s (debug, EAS, Play app signing), they create the clients; then re-download both Firebase files. Continue with Google stays hidden until then.
- **Already matching:** #16, #17, #19, #20, #24 needed no app change.

## Next steps
1. Get the test-business owner + staff logins (the Sheet's "Start here" still says they're coming). Sign the emulator out of the real account.
2. Go screen by screen on the test business against the Sheet's **Screen checklist** tab: Send (phone + consent, email-only), Resend, client detail, chats reply, feedback, reviews reply, card edit (do **not** fill the card address), push (allow → trigger → tap), Ask AI, owner vs staff, Austin/Dallas, 401, offline.
3. Real Android phone (NFC writing, push) and the iPhone dev build (owner: `npx eas-cli login`, `npx eas-cli init`, `npx eas-cli device:create`, EAS file env vars — see README).
4. Build the "Ready to build" API answers above (one small commit each).
5. Ask for `POST /broadcasting/auth` and `PUT /digital-cards/slug` to be added to the Sheet; get the owner's OK for Firebase Messaging on iOS.
6. TestFlight and Play internal testing (the app icon and splash are done; check the icon on a real iPhone).
7. Owner fills the Sheet's "Done (date)" column (Claude has view-only access).

## Running locally
- Metro: `npx expo start --dev-client --port 8081`. Only one Metro at a time; a second one starts on 8082 and the app won't use it.
- Emulator: `adb reverse tcp:8081 tcp:8081`, then open the dev client at `exp+onetouchreview://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.
- **Emulator networking is flaky.** If the app shows "You're offline" / "That took too long" while the PC is online, restart it with `emulator -avd Medium_Phone_API_36 -dns-server 8.8.8.8 -no-snapshot-load`. The same cold boot fixes a **stuck splash screen** (white screen with the logo while the log shows the API calls succeeding): `adb shell dumpsys SurfaceFlinger --list` shows a "Splash Screen com.onetouchreview.app" layer left on top.
- Start Metro with `npx expo start --dev-client` (or `npm start`), never `npx react-native start` — that's the bare React Native CLI, which this Expo project doesn't use.
- Rebuild native only when native deps, `app.config.ts`, icons or the splash change: `npx expo prebuild --platform android --clean`, then `npx expo run:android --no-bundler`. If it fails at the install step, `adb push` the APK (`android/app/build/outputs/apk/debug/app-debug.apk`) to `/data/local/tmp` and `adb shell pm install -r` it.
- Screenshots: `adb shell screencap -p /sdcard/s.png` then `adb pull` (PowerShell `>` redirection corrupts binary output).

## Other notes
- Baseline check of sibling repos (2026-10-06): only `Medhiwa-23_Advantage` changed (owner's own commit + merge); Stech, thedemostop, Wazigo unchanged.
- Brand assets: generated from the owner's logo files (outside the repo) into `assets/images/` (`icon`, `android-icon-*`, `splash-icon`, `brand-mark`, `brand-logo`, `brand-wordmark`). Colours live in `src/constants/theme.ts`.
- Between the splash and the app, the development build shows a few black seconds while it loads the bundle (also without the launch screen). Expected to be gone in release builds; not checked yet.
