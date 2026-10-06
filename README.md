# OneTouchReview (mobile)

React Native + Expo SDK 57 (TypeScript, Expo Router, Redux Toolkit) app for OneTouchReview business owners and staff.
Project rules: [CLAUDE.md](CLAUDE.md). Open API questions: [docs/API-GAPS.md](docs/API-GAPS.md).

- Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0
- npm only · Expo Development Build (never Expo Go) · Continuous Native Generation (`android/`, `ios/` are generated, gitignored)
- App ID: `com.onetouchreview.app`

## One-time setup

1. Node 22, JDK 17, Android Studio + SDK (`ANDROID_HOME` set), `adb` on PATH.
2. Put the Firebase files in the project root (gitignored, never committed, contents unchanged):
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
3. `npm install`

## Daily commands (from `D:\React Native\OneTouchReview`)

| What | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start Metro for the dev build | `npm start` (= `npx expo start --dev-client`) |
| Start with a clean Metro cache | `npx expo start --dev-client --clear` |
| Build + install the Android dev build on a USB phone/emulator | `npx expo run:android --device` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| All three | `npm run verify` |
| Project health | `npm run doctor` |
| Add a native/Expo package | `npx expo install <package>` |
| Fix package versions for SDK 57 | `npx expo install --fix` |

`npx expo run:android` runs prebuild automatically when needed. Don't run `npx expo prebuild` by hand unless debugging native output (`--clean` regenerates `android/` from `app.config.ts`).

## iPhone development build (from Windows, via EAS)

Windows can't run Xcode or the iOS Simulator. iOS native builds run on EAS; the iPhone then loads JavaScript from Metro on this PC.

One time (you sign in to Expo and Apple yourself):
```
npx eas-cli login
npx eas-cli init                       # creates the EAS project; put the projectId in EAS_PROJECT_ID or app.config.ts
npx eas-cli device:create              # register the iPhone (open the link on the phone)
npx eas-cli env:create --environment development --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
npx eas-cli env:create --environment development --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret
```
(Repeat the two `env:create` commands for `preview` and `production`.)

Build and install:
```
npx eas-cli build --profile development --platform ios
```
Install from the link/QR EAS prints, then `npm start` on this PC and open the project from the dev client (same Wi‑Fi, or `npx expo start --dev-client --tunnel`).

Rebuild only when native code changes (new native package, `app.config.ts` plugin/permission changes). JS changes need no rebuild.

## Later: release builds
```
npx eas-cli build --profile production --platform all
npx eas-cli submit --platform ios       # TestFlight
npx eas-cli submit --platform android   # Play internal testing
```

## Optional configuration (environment variables)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME` | Google Sign-In. Unset → the Google button is hidden. Never guess these. |
| `GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST` | Firebase file paths (EAS file env vars). Default: project root. |
| `EAS_PROJECT_ID` | EAS project id. |

## Capturing real API responses (test business only)

The Sheet doesn't document some response bodies. Capture them from **OneTouchReview Mobile Test** with the owner and staff logins:
```
node scripts/capture-responses.mjs owner
node scripts/capture-responses.mjs staff
```
Read-only (GETs, plus sign-in / one refresh / sign-out). Passwords are typed at a hidden prompt and never saved; tokens are redacted.
Output goes to `.api-captures/` (gitignored).

## Structure
```
src/
  app/            Expo Router routes: (auth), (app)/(tabs), blocking screens (update-required, startup-error, suspended)
  api/            network.ts (only axios importer), errors.ts, paths.ts, types.ts, *.api.ts
  features/       Redux slices + thunks by feature (session, auth, appConfig, location, network)
  services/       storage (tokenStorage = SecureStore, prefsStorage = AsyncStorage), device, network, auth, session
  components/ui/  Shared UI (Screen, Button, TextField, CodeInput, states, OfflineBanner)
  config/         env.ts, permissions.ts (roles)
  hooks/, utils/, constants/
tests/            Jest setup and HTTP mock
scripts/          capture-responses.mjs
```
