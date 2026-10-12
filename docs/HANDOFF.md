# Session handoff — 2026-10-12 (end of day)

Read `CLAUDE.md` first (project rules), then `docs/API-GAPS.md` (contract questions and the API team's answers).

## Today (2026-10-12) in short
- **API answers built.** The API team answered almost every API-GAPS question on 2026-10-08 (recorded in `2bc4841`). All eight "ready to build" items are in: #11, #13, #18, #21, #22, #23, #27, #28 (one commit each, see Done).
- **Brand redesign** from the owner's mockups and logo files: teal/gold/navy theme, logo in headers, icon tiles, initials avatars, empty-state icons, new app icon / adaptive icon / notification icon, and the **dark brand splash** (owner's pick of three) as native splash + launch screen.
- **Mockup screens** applied where the API has the data: raised Send button in the tab bar, sign-in screens, Send "Contact method" (`channel` auto / sms / email), client detail header, My card gradient card (QR with logo), notifications All / Unread with kind icons, Profile & Security, full-screen state icons, Reviews rating summary, chat header. Home quick actions were added and then **removed at the owner's request** (`83e6733`).
- **Bugs fixed:** double `POST /devices` on every start (`83ea2f7`); review AI drafts never showed (`ai_reply` is an object, not a string — `0ffc197`); **every Reports tab was blank on Android** (custom refreshControl dropped its children — `070816c`); Metro hanging after Android builds (`b5541b6`); **keyboard covering inputs on Android** (`064b982`, same fix as the Stech app — see Gotchas; not yet confirmed on a device).
- **Google Play release prep** (`0b319cc`): the app exists in Play Console as a **Draft** (`com.onetouchreview.app`). The owner builds the signed bundle in Android Studio. See "Google Play release" below.
- **Play Store screenshots** (local only, git-ignored `play-store-screenshots/`): 7 of 8 done from the release build. See "Google Play release".
- **Android Studio Gradle sync fixed** (`828bc4d`): it failed on the project path's space ("React Native") inside expo-modules-core's `generateStubPCH`. See Gotchas.
- **One native crash** (SIGSEGV in React Native's Fabric renderer, `MountingCoordinator::pullTransaction`, at startup in the dev build); not reproducible in 5 cold starts, no code change. See Gotchas.
- **New API gap #29:** the live API sends six notification kinds the Sheet doesn't list.
- Lint, typecheck and **147 tests** pass. Everything is pushed; `main` is in sync with GitHub.

## Status in one paragraph
Every screen in the build guide (Version 2) exists in code and now carries the brand redesign. Lint, typecheck and **147 tests** pass. Read-only screens were checked on the Android emulator (see "Verified"). **Nothing has been verified on the test business, a real Android phone or an iPhone yet** — the emulator is still signed in to a real customer business, so anything that writes (sending, resending, replying, posting, editing, assigning, Ask AI, opening a chat — it marks it read) was deliberately not exercised. That verification is still the next job.

## Approved decisions (from the owner)
- Location `D:\React Native\OneTouchReview`, independent repo. Never modify other projects in `D:\React Native` (Wazigo may be *read* as an architecture reference).
- Expo SDK 57 (57.0.27) · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3 · npm only.
- Continuous Native Generation (`android/`, `ios/` generated + gitignored). Dev build only, never Expo Go.
- Token + `token_expires_at` in SecureStore only. AsyncStorage: selected location only.
- NO cached `/app-config` fallback, NO cached identity: a cold start that can't reach the API → Retry screen. Once booted, offline never signs out.
- iOS push token type and Reverb auth/events were answered 2026-10-08 (API-GAPS #1, #2), but nothing is built yet: iOS push needs `@react-native-firebase/messaging` (ask the owner before adding it); realtime waits until `POST /broadcasting/auth` is in the Sheet. Google OAuth IDs (#12) are still in progress.
- Firebase files gitignored (present locally); EAS file env vars for cloud builds.
- Navigation: tabs Home / Clients / Send (raised centre button) / Chats / More; bell + location switcher in the header. Feedback, Reviews, My card, Reports, Ask AI, Notification settings and Profile open from More.
- **Design:** follow the owner's mockups only where they fit the app's data — "don't go with full design placement". Never invent data or endpoints for a mockup element (charts, trends, counts, per-star bars, WhatsApp, Apple sign-in, in-app sign-up, Contact support were left out for that reason). Light theme only; the only dark surface is the launch screen. **No quick actions on Home** (owner removed them).
- The owner asks for a build step, then a commit and push after each one.

## Repository
- GitHub: https://github.com/dev-saman/OneTouchReview-Mobile (**public**), branch `main`, pushed and in sync.
- Because it's public: **never put real business, client or person names in code, tests, docs or commit messages.** History was rewritten and force-pushed twice on 2026-10-07 to remove real business names; no real names remain anywhere in history (checked with `git log --all -S <name>`). The mockups the owner shares contain real names — don't copy them into anything.
- Commit `825d096`'s message starts with an invisible BOM (written with PowerShell `Set-Content -Encoding utf8`). Cosmetic; left as is. Write commit message files with the editor tool and `git commit -F`, never `-m` with quotes and never `Set-Content`.

## Architecture guards (ESLint `no-restricted-imports`)
One module owns each sensitive dependency:
- `axios` → `src/api/network.ts` · `expo-secure-store` → `src/services/storage/tokenStorage.ts` · AsyncStorage → `src/services/storage/prefsStorage.ts`
- `react-native-nfc-manager` → `src/services/nfc/nfc.ts` (always cancels the technology request — tested)
- `expo-notifications` → `src/services/push/push.ts` (also sets the app icon badge)

Shared building blocks: `useApiQuery(key, fetcher)` (keyed loads, stale requests cancelled), `usePagedList` (page numbers or `next_cursor`), `useRefreshOnFocus`, `useDebouncedValue`, `utils/format.ts` (incl. `initials`, `greeting`), `services/web/openWebApp.ts` (web app home or a safe path; never billing).

UI kit (`src/components/ui/`): Card, Badge, InfoRow, Chips, Stars, Checkbox, ListFooter, TextField (eye toggle, optional leading `icon`), Button (optional `icon`), **Avatar** (initials), **IconTile** (tinted icon square, tones brand / accent / info / danger), **Brand** (BrandMark, BrandLogo, BrandWordmark, BrandWordmarkLight with `allWhite`), **AuthHeader** + OrDivider (centred header for sign-in and state screens, `tone`), **LaunchScreen** (`LAUNCH_COLORS`), **KeyboardAvoider** (use it for anything with text inputs, never a bare `KeyboardAvoidingView`), EmptyState (optional `icon`). Theme tokens in `src/constants/theme.ts` (`colors`, `radius`, `shadow`).

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
| `1386121` `5794ff4` | CLAUDE.md + handoff updates for the answers; prebuild gotcha |
| `cd90ac5` | Brand redesign: theme, icons, launch screen |
| `16ad781` | #11 sign out the new-user token after Google sign-in (`bearerToken` request option) |
| `a80a0bf` | #13 "Open OneTouchReview on the web" link (`Config.webAppUrl`) |
| `04957f4` | #18 daily text limit warning in plain words |
| `d2ad5f6` | #21 Urgent badge + AI summary on private feedback |
| `0ffc197` | #22 Needs a reply / Negative filters; AI drafts read from `ai_reply.text` (bug fix) |
| `a9ac7b2` | #23 Assign chats (`GET /chat-team`, `assigned_user_id`) |
| `4bb1d0c` | #27 Ask AI history (last 6 turns) and answer links |
| `db13134` | #28 Insights themes, team members, by-location |
| `070816c` | **Fix:** empty Reports tabs on Android |
| `816fa40` | Dark brand launch screen (native splash `#0A2A3A`) |
| `b5541b6` | `metro.config.js`: ignore native build output (Metro hang) |
| `2e78a14` | Raised Send button in the tab bar (+ Home quick actions, removed later) |
| `1637eb5` | Sign-in screens restyled |
| `b3f9405` | Send: Contact method (`channel` auto / sms / email) |
| `64c578a` | Client detail header (avatar, added date, rating, Call / Email) |
| `895ee0f` | My card gradient card, QR with logo (ecl H) |
| `2d236cd` | Notifications All / Unread + kind icons; API-GAPS #29 |
| `5f3cb7a` | Profile & Security layout |
| `7395126` | Icon headers on update / error / suspended screens |
| `9c6f6d1` | Reviews rating summary |
| `0006108` | Chat header with avatar, name and channel |
| `83e6733` | Home quick actions removed (owner) |
| `73e7d86` `48af9e6` | Handoff update; design rules in CLAUDE.md |
| `064b982` | **Fix:** keyboard covering inputs on Android (`KeyboardAvoider`) |
| `4ddd79a` `ff7e8ff` | Handoff + CLAUDE.md keyboard rule |
| `a39070a` | Git-ignore `play-store-screenshots/` |
| `0b319cc` | Android release prep: `versionCode` in app.config, SYSTEM_ALERT_WINDOW blocked |
| `5d80b28` | Handoff: Google Play release prep and store screenshots |
| `828bc4d` | **Fix:** Android Studio sync on the spaced path (`plugins/with-stub-pch-space-fix.js`) |

## Where the response shapes come from
- The Sheet's Endpoints tab has a **"Response example"** column (column G) for all endpoints, and its Notes now include the API team's answers (e.g. `GET /chat-team`, `assigned_user_id`, Ask AI history). Types in `src/api/types.ts` keep only fields the screens use.
- The examples are real API output from a temporary **local** test database with made-up data — not production, not the test business. Field names are reliable; behaviour on production still needs checking.
- To download the Sheet as CSV (it's viewable without login): `https://docs.google.com/spreadsheets/d/1STt5_YC5VnGGG1kSNTDaDmQm6VZidxcZhFdSpbq7vc0/gviz/tq?tqx=out:csv&sheet=Endpoints`
- The build guide (Google Doc) exports as text: `https://docs.google.com/document/d/1VciMlI4NrYcgis-KnXNOqYjhWpglZyVSppm6TDSdhoE/export?format=txt`

## Gotchas
- **Android Studio "Gradle project sync failed" — "Stub PCH generation failed: clang++: error: no such file or directory: 'D:\React D:/React Native/…'"** (fixed in `828bc4d`). Sync runs `prepareKotlinBuildScriptModel`, which depends on expo-modules-core's `generateStubPCH` (57.0.21 = latest 57.x). That task rebuilds the clang command with `cmd.split(" ")` and `[^\s]+` paths, so the space in `D:\React Native\…` breaks it. Command-line builds never run it. The task only writes empty stub PCH files for the IDE's C++ indexer (the real build compiles the PCH via ninja), so `plugins/with-stub-pch-space-fix.js` adds a snippet to `android/build.gradle` that disables it when the path contains a space. Verified: `./gradlew prepareKotlinBuildScriptModel` → BUILD SUCCESSFUL with `:expo-modules-core:generateStubPCH SKIPPED` (worklets / reanimated stubs still run). **Doesn't work:** `subst` drive letters or junctions (Node resolves them back to the real path), and `subst` onto the project folder itself (Expo autolinking can't find `package.json` at a drive root). Remove the plugin when expo-modules-core quotes its arguments; check after `npx expo install --fix`. After changing it, `prebuild --clean` and, if the sync still fails, delete `node_modules/expo-modules-core/android/.cxx` (stale CMake paths).
- **Native crash at startup (once):** SIGSEGV on the JS thread (`mqt_v_js`) in `facebook::react::MountingCoordinator::pullTransaction`, 0.85 s after "Running main", on the launch screen in the dev build (2026-10-12 15:13). Not reproducible in 5 cold starts; no matching upstream report found; no code change. If it happens again, read `adb logcat -b crash` straight away (it gets cleared), note what was done, and try a release build / `npx expo install --fix`.
- **Keyboard over inputs on Android** (fixed in `064b982`, same root cause as the Stech app). SDK 57 is edge-to-edge, so Android no longer resizes the window for the keyboard (`adjustResize` is ignored), and `KeyboardAvoidingView` with `behavior` only on iOS rendered a plain View. `src/components/ui/KeyboardAvoider.tsx` uses `behavior="padding"` on both platforms. It also measures its own position on screen (`measureInWindow`) and passes it as `keyboardVerticalOffset`, because `KeyboardAvoidingView` computes the overlap from its frame relative to its *parent* and under-shoots by the header height (this replaced the hard-coded iOS offset of 96). Used by `Screen` (all forms), the chat screen and Ask AI. **Not confirmed yet:** this emulator's Gboard is stuck in floating-toolbar mode and takes no space, so the overlap can't be reproduced here. Check on a physical phone (or a docked keyboard): Send → New client → tap Email, the field must stay above the keyboard; also the chat composer and Ask AI input.
- **Metro stopped answering after Android builds** (blank app, Metro at 100% CPU, `/status` times out). Gradle writes ~7,000 files under `node_modules/*/android/build`, and without Watchman Metro kept reprocessing them. `metro.config.js` now block-lists native build output; after a full `prebuild --clean` + build, Metro kept answering. Metro still sits at ~100% of one core while running in the background, but stays responsive. If it hangs anyway: stop it and run `npx expo start --dev-client`.
- **Don't let the app connect to `192.168.1.108:8081`.** `expo run:android` opens the dev client with the PC's Wi-Fi address, which this PC blocks (likely Windows Firewall), so the app stays blank. Use the adb tunnel instead: `adb reverse tcp:8081 tcp:8081`, then open `exp+onetouchreview://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` once; later icon launches remember it.
- **`expo run:android` reuses an existing `android/` folder**, so changes to icons, splash, colours or `app.config.ts` don't reach the build. Regenerate first with `npx expo prebuild --platform android --clean` (safe: `android/` is generated and gitignored), then `npx expo run:android --no-bundler`.
- **Android ScrollView + custom refreshControl:** Android renders the ScrollView's content as the refresh control's *children*. A wrapper component must forward its props (see `Refresh` in `reports.tsx`) or the screen renders empty. Passing `<RefreshControl …/>` directly is safe.
- **Button / Pressable `onPress={fn}` passes the press event** as the first argument. Wrap functions that take optional arguments (`onPress={() => openWebApp()}`).
- **Push token fired twice:** in expo-notifications, fetching the device token also fires the token-change listener with the same token. `registerDevice()` skips a token already registered or in flight, retries after a failure and resets when PushManager unmounts on sign-out.
- **Expo Router index routes:** the generated types name `folder/index.tsx` as `/folder/index`, which does **not** resolve at runtime ("Unmatched Route"). Use `folder.tsx` next to `folder/` instead (as `profile.tsx`, `feedback.tsx`, `reviews.tsx`, `card.tsx` do).
- **Route types lag behind new files.** If typecheck rejects a new route, touch the file (or reload the app) so Metro regenerates `.expo/types/router.d.ts`.
- **Android push permission:** "never asked" reports as `denied` + `canAskAgain: true` (iOS reports `undetermined`). PushManager asks when not granted and `canAskAgain`.
- **ESLint React Compiler rules:** don't call a function that sets state at the top of an effect (start the request, set state in `.then`), and don't read `ref.current` during render (use `useState(() => new Animated.Value(0))` instead of `useRef(...).current`).

## Google Play release
- **Play Console:** app `com.onetouchreview.app` created, status **Draft**, nothing uploaded yet (as of 2026-10-12).
- **Checked on the release APK** (`aapt2 dump badging`): package `com.onetouchreview.app`, `versionCode` 1 / `versionName` 1.0.0, target SDK 36 (Play needs ≥ 35), no CAMERA / RECORD_AUDIO, storage permissions only up to Android 12 (`maxSdkVersion 32`). SYSTEM_ALERT_WINDOW is now blocked (`android.blockedPermissions`). Remaining permissions come from libraries (push, badges, NetInfo, SecureStore's biometric entries — the app doesn't use biometrics).
- **Version:** `android.versionCode` lives in `app.config.ts` (never edit it in `android/`, prebuild overwrites it). **Bump it for every Play upload**; bump `version` for user-visible releases.
- **Signing:** the generated `build.gradle` signs release with the **debug keystore**, which Play rejects. The owner builds with Android Studio → open `android/` → Build → **Generate Signed App Bundle** (`.aab`) → create/choose the **upload key**, stored **outside the repo** (e.g. `D:\keys\onetouchreview-upload.jks`) and backed up with its passwords → release variant. The wizard's signing overrides the debug config. Keep **Play App Signing** on. Never commit a keystore (`*.keystore` is git-ignored; also keep `.jks` out).
- **Before every build:** after any change to `app.config.ts`, icons, splash, config plugins or native deps run `npx expo prebuild --platform android --clean`, then in Android Studio open `android/` and sync (File → Sync Project with Gradle Files) before building. The upload key is safe because it lives outside the project.
- **Release build on the emulator:** `npx expo run:android --variant release --no-bundler` (~16 min the first time). It replaced the dev build on the emulator on 2026-10-12; reinstall the dev build with `npx expo run:android` before developing.
- **Store screenshots** (`play-store-screenshots/`, git-ignored, 1080×1920 — Play rejects the emulator's 1080×2400 because the long side may be at most twice the short side): `01-splash`, `02-sign-in`, `03-sign-in-password`, `04-dashboard`, `05-chats`, `06-notifications`, `07-more`. Taken from the release build (no dev Tools button). The owner's account manages several real businesses, so data screens were captured with the owner's own "One Touch Review" location selected (dashboard all zeros, no chats), notifications cut after the 4th item (later items name other businesses' pages), and the location restored afterwards. **Choose location is not included** (it lists other customers). `07-more` shows the owner's company email — owner's call before uploading. Re-take all data screens on the test business once its login exists. Crop helper: top of screen + real tab bar (keep ~70 px above the bar so the raised Send button isn't clipped).

## Verified on the Android emulator (Medium_Phone_API_36)
- Earlier: startup, sign-in, Home, Clients, Send form, bell count, More, Profile, Signed-in devices, My card, Edit card (nothing saved), push prompt.
- 2026-10-12, read-only: native dark splash + launch screen, app icon in the drawer (fits the round mask), Home (greeting, stat tiles), tab bar with raised Send, Clients with avatars, client detail header, Send with Contact method (sample data typed, **nothing sent**), Chats list, More, Profile & Security, My card gradient card, Reviews filters + rating summary, Reports (all tabs, after the fix), notifications All / Unread.
- **Not verified yet:** the keyboard fix (emulator keyboard can't reproduce it), sign-in screens and full-screen states in their new look (need signing out), chat screen header and Assign (opening a chat marks it read), Ask AI history and links, urgent feedback badge with data, Send for real (incl. the chosen channel), Resend, replies, photo upload, **QR with logo scanning on a real phone**, NFC writing, push delivery and taps, owner vs staff, Austin/Dallas switching, 401 → sign-in, offline/5xx keeps the session.
- ⚠️ The emulator is still signed in to a **real customer business**, not the test business, and is registered for push on that account. Remove it under Profile → Signed-in devices (or sign out), and use only the "OneTouchReview Mobile Test" (business 99) logins. Never send, resend, reply, post, edit cards, assign, ask AI or open chats on a real business.

## API questions
`docs/API-GAPS.md` has 29 items.
- **Built 2026-10-12:** #11, #13, #18, #21, #22, #23, #27, #28.
- **Answered but blocked:**
  - #1 iOS push: needs an FCM token from Firebase Messaging; owner OK needed to add `@react-native-firebase/messaging`.
  - #2 Reverb realtime: `POST /broadcasting/auth` isn't in the Sheet yet; ask for it to be added. Chats keep refreshing on focus / foreground / pull.
  - #26 business card address: `PUT /digital-cards/slug` isn't in the Sheet yet.
  - #25 "my card": no field yet (the API team will add one).
- **In progress:** #12 Google OAuth clients: we send SHA-1s (debug, EAS, Play app signing), they create the clients; then re-download both Firebase files. Continue with Google stays hidden until then.
- **Open:** #29 the live API sends notification kinds the Sheet doesn't list (`billing`, `google_profile`, `site_review`, `site_reviews`, `review_shield_flagged`, `meta_reconnect`). They get a generic icon and show only their text on tap until documented.
- **Already matching:** #16, #17, #19, #20, #24 needed no app change.
- Ask AI links open the **web app** at the given path (billing-like paths dropped): no mapping from web paths to app screens is documented.

## Next steps
1. Get the test-business owner + staff logins (the Sheet's "Start here" still says they're coming). The emulator is still signed in to the owner's account, which manages several **real** businesses — the owner's sign-ins so far all opened that account. With the test login: re-take the store screenshots (incl. Choose location) and do the checks below.
2. Go screen by screen on the test business against the Sheet's **Screen checklist** tab, including today's work: Send (phone + consent, email-only, each Contact method), Resend, client detail, chat reply + Assign, feedback (Urgent badge), reviews reply + AI draft, Ask AI follow-ups and links, card edit (do **not** fill the card address), push (allow → trigger → tap), owner vs staff, Austin/Dallas, 401, offline; and the sign-in and state screens in their new look.
3. Real Android phone (NFC writing, push, **scan the QR with the logo**, **keyboard stays clear of inputs** on Send, profile forms, chat and Ask AI) and the iPhone dev build (owner: `npx eas-cli login`, `npx eas-cli init`, `npx eas-cli device:create`, EAS file env vars — see README). Check the app icon and splash on the iPhone.
4. Ask for `POST /broadcasting/auth` and `PUT /digital-cards/slug` to be added to the Sheet, and for the six notification kinds in #29 to be documented; get the owner's OK for Firebase Messaging on iOS.
5. **Google Play:** owner builds the signed `.aab` in Android Studio with the upload key and uploads it to **internal testing** first; fill in the store listing (screenshots in `play-store-screenshots/`), data safety form and content rating. Then TestFlight for iOS.
6. Owner fills the Sheet's "Done (date)" column (Claude has view-only access).

## Running locally
- Metro: `npx expo start --dev-client` (or `npm start`). Only one Metro at a time on 8081; a second one starts on 8082 and the app won't use it. Never `npx react-native start` — that's the bare React Native CLI, which this Expo project doesn't use.
- Emulator: `adb reverse tcp:8081 tcp:8081`, then open the dev client at `exp+onetouchreview://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` (see Gotchas: not the Wi-Fi address).
- **Emulator networking / graphics are flaky.** If the app shows "You're offline" / "That took too long" while the PC is online, or a **stuck splash** (white or navy screen with the logo while the log shows the API calls succeeding; `adb shell dumpsys SurfaceFlinger --list` shows a "Splash Screen com.onetouchreview.app" layer left on top), cold-boot it: `emulator -avd Medium_Phone_API_36 -dns-server 8.8.8.8 -no-snapshot-load`.
- Rebuild native only when native deps, `app.config.ts`, icons or the splash change: `npx expo prebuild --platform android --clean`, then `npx expo run:android --no-bundler`. If it fails at the install step, `adb push` the APK (`android/app/build/outputs/apk/debug/app-debug.apk`) to `/data/local/tmp` and `adb shell pm install -r` it.
- To see the launch screen, startup is usually too fast; temporarily delay `dispatch(runBootstrap())` in `src/app/_layout.tsx` (and remove it again).
- Screenshots: `adb exec-out screencap -p > s.png` from Git Bash, or `adb shell screencap -p /sdcard/s.png` then `adb pull` (PowerShell `>` redirection corrupts binary output). In Git Bash set `MSYS_NO_PATHCONV=1` so `/sdcard/...` paths aren't rewritten.
- Deep links for checking screens: `adb shell am start -a android.intent.action.VIEW -d "onetouchreview://reviews" com.onetouchreview.app` (also `home`, `send`, `card`, `profile`, `reports`, `notifications`).

## Other notes
- Baseline check of sibling repos (2026-10-06): only `Medhiwa-23_Advantage` changed (owner's own commit + merge); Stech, thedemostop, Wazigo unchanged.
- Brand assets: generated from the owner's logo files (outside the repo) into `assets/images/` (`icon`, `android-icon-*`, `splash-icon`, `brand-mark` 512 px, `brand-logo`, `brand-wordmark`, `brand-wordmark-light`, `brand-wordmark-white`). Brand colours: teal `#018F7C`, gold `#FBB10A`, navy text `#0B1F3A`, launch navy `#0A2A3A`.
- Between the splash and the app, the development build shows a few black seconds while it loads the bundle (also without the launch screen). Expected to be gone in release builds; not checked yet.
