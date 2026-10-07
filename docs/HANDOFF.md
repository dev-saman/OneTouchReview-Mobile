# Session handoff — 2026-10-07 (end of day)

Read `CLAUDE.md` first (project rules), then `docs/API-GAPS.md` (open contract questions).

## Status in one paragraph
Every screen in the build guide (Version 2) now exists in code: sign-in, Profile, signed-in devices, Send, Push (Android), Reviews, Private feedback, Chats, Dashboard, My card, Clients, location switcher, Edit card, Reports, Ask AI and the notifications bell. Lint, typecheck and **126 tests** pass. **None of it has been verified on the test business, a real Android phone or an iPhone yet** — the emulator was only ever signed in to real customer accounts, so anything that writes (sending, resending, replying, posting, editing, Ask AI, allowing push) was deliberately not exercised. That verification is the next job.

## Approved decisions (from the owner)
- Location `D:\React Native\OneTouchReview`, independent repo. Never modify other projects in `D:\React Native` (Wazigo may be *read* as an architecture reference).
- Expo SDK 57 (57.0.27) · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3 · npm only.
- Continuous Native Generation (`android/`, `ios/` generated + gitignored). Dev build only, never Expo Go.
- Token + `token_expires_at` in SecureStore only. AsyncStorage: selected location only.
- NO cached `/app-config` fallback, NO cached identity: a cold start that can't reach the API → Retry screen. Once booted, offline never signs out.
- iOS push token type, Reverb auth/events, Google OAuth IDs: open questions — don't guess, don't install `@react-native-firebase/messaging`.
- Firebase files gitignored (present locally); EAS file env vars for cloud builds.
- Navigation: tabs Home / Clients / Send / Chats / More; bell + location switcher in the header. Feedback, Reviews, My card, Reports, Ask AI, Notification settings and Profile open from More.
- The owner asks for a build step, then a commit and push after each one.

## Repository
- GitHub: https://github.com/dev-saman/OneTouchReview-Mobile (**public**), branch `main`, pushed and in sync.
- Because it's public: **never put real business, client or person names in code, tests, docs or commit messages.** History was rewritten once (2026-10-07) to remove a real business name; an older version of this file (commits before this one) still names another real business in history — rewrite only if the owner asks.
- Commit `352a7fb`'s message starts with an invisible BOM (written with PowerShell `Set-Content -Encoding utf8`). Cosmetic; left as is. Write commit message files with the editor tool and `git commit -F`, never `-m` with quotes and never `Set-Content`.

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
| `d0ed509` | Expo SDK 57 patch updates (`npx expo install --fix`) |
| `b338300` | Profile: confirm email, set/change/remove password, reminder, change email |
| `a4b905d` | Send a review request: existing client or add-and-send, consent tick rules (tested), refusals in plain words |
| `1b3e163` | Notifications bell + app icon badge (count in a React context, not Redux) |
| `570c4c8` | Private feedback, Google reviews (AI draft, reply coach, post/edit/delete); **fixed the Profile link** |
| `48c4064` | Chats inbox + chat screen (`client_id` outbox, mark done/reopen) |
| `6de77b1` | My card: QR from `short_url`, share, write NFC tag |
| `352a7fb` | Edit card (changed fields only; photo → JPEG ≤ 1200 px, upload) |
| `7734b34` | Reports (likes/dislikes, insights, weekly report) and Ask AI |
| `ec5c57e` | Signed-in devices |
| `2e99930` | Push (Android) + Notification settings |

## Where the response shapes come from
- The Sheet's Endpoints tab has a **"Response example"** column (column G) for all 64 endpoints. Types in `src/api/types.ts` keep only fields the screens use.
- The examples are real API output from a temporary **local** test database with made-up data — not production, not the test business. Field names are reliable; behaviour on production still needs checking. Fields that are always `null` / `[]` in the examples are treated as unknown and are API-GAPS questions, never guessed.
- To download the Sheet as CSV (it's viewable without login): `https://docs.google.com/spreadsheets/d/1STt5_YC5VnGGG1kSNTDaDmQm6VZidxcZhFdSpbq7vc0/gviz/tq?tqx=out:csv&sheet=Endpoints`
- The build guide (Google Doc) exports as text: `https://docs.google.com/document/d/1VciMlI4NrYcgis-KnXNOqYjhWpglZyVSppm6TDSdhoE/export?format=txt`

## Gotchas found today
- **Expo Router index routes:** the generated types name `folder/index.tsx` as `/folder/index`, which does **not** resolve at runtime ("Unmatched Route"). Use `folder.tsx` next to `folder/` instead (as `profile.tsx`, `feedback.tsx`, `reviews.tsx`, `card.tsx` do).
- **Route types lag behind new files.** If typecheck rejects a new route, touch the file (or reload the app) so Metro regenerates `.expo/types/router.d.ts`.
- **Android push permission:** "never asked" reports as `denied` + `canAskAgain: true` (iOS reports `undetermined`). PushManager asks when not granted and `canAskAgain`.
- **ESLint `react-hooks/set-state-in-effect`:** don't call a function that sets state at the top of an effect; start the request and set state in `.then` (see `useApiQuery`, `BadgeProvider`).

## Verified on the Android emulator (Medium_Phone_API_36)
- Startup, sign-in, Home dashboard with live numbers, Clients (empty state), Send form (consent tick appears unticked; nothing sent), bell count, More menu (role-based rows, Ask AI shown via `/ai/status`), Profile, Signed-in devices, My card (QR renders), Edit card (form loads; nothing saved), push permission prompt after sign-in (not answered).
- **Not verified anywhere yet:** client detail with data, Not sent, paging, Resend, Send for real, chats, feedback, reviews/replies, Ask AI answers, reports content, NFC writing (needs a real phone), photo upload, push delivery and taps, owner vs staff, Austin/Dallas switching, 401 → sign-in, offline/5xx keeps the session.
- ⚠️ The emulator is signed in to a **real customer business**, not the test business. It has been signed in to two different real businesses today. Sign out, and use only the "OneTouchReview Mobile Test" (business 99) logins. Never send, resend, reply, post, edit cards, ask AI or allow push on a real business.

## Open API questions
`docs/API-GAPS.md` has 28 items; answered: #4, #8, #10. The ones that block features:
- **#1** iOS push token type → iOS push registration.
- **#2** Reverb auth + events → live chat updates (chats refresh on focus/foreground/pull meanwhile).
- **#23** chat assign request field → Assign.
- **#27** Ask AI history turn format → history is sent empty, so follow-up questions lack context.
- **#12** Google OAuth client IDs → Continue with Google stays hidden.

## Next steps
1. Get the test-business owner + staff logins (the Sheet's "Start here" still says they're coming). Sign the emulator out of the real account.
2. Go screen by screen on the test business against the Sheet's **Screen checklist** tab: Send (phone + consent, email-only), Resend, client detail, chats reply, feedback, reviews reply, card edit (do **not** fill the card address), push (allow → trigger → tap), Ask AI, owner vs staff, Austin/Dallas, 401, offline.
3. Real Android phone (NFC writing, push) and the iPhone dev build (owner: `npx eas-cli login`, `npx eas-cli init`, `npx eas-cli device:create`, EAS file env vars — see README).
4. Polish: app icon and splash (brand assets not supplied yet), then TestFlight and Play internal testing.
5. Owner fills the Sheet's "Done (date)" column (Claude has view-only access).

## Running locally
- Metro: `npx expo start --dev-client --port 8081`. Only one Metro at a time; a second one starts on 8082 and the app won't use it.
- Emulator: `adb reverse tcp:8081 tcp:8081`, then open the dev client at `exp+onetouchreview://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`.
- **Emulator networking is flaky.** If the app shows "You're offline" / "That took too long" while the PC is online, restart it with `emulator -avd Medium_Phone_API_36 -dns-server 8.8.8.8 -no-snapshot-load`.
- Rebuild native only when native deps / `app.config.ts` plugins change: `npx expo run:android --no-bundler`. If it fails at the install step, `adb push` the APK (`android/app/build/outputs/apk/debug/app-debug.apk`) to `/data/local/tmp` and `adb shell pm install -r` it.
- Screenshots: `adb shell screencap -p /sdcard/s.png` then `adb pull` (PowerShell `>` redirection corrupts binary output).

## Other notes
- Baseline check of sibling repos (2026-10-06): only `Medhiwa-23_Advantage` changed (owner's own commit + merge); Stech, thedemostop, Wazigo unchanged.
- App icons/splash are template placeholders.
