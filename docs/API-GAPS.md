# API gaps and open contract questions

Things the Sheet doesn't specify, or where the live API differs from it. **The app does not work around any of these.**
Each item is answered by the owner / API team, then the app is implemented against the answer.

Report format for a live difference: endpoint · request · exact curl · expected · actual · HTTP status · error code · what needs fixing.

| # | Area | Question | Blocks | Status |
|---|------|----------|--------|--------|
| 1 | Push (iOS) | For iOS `POST /devices`, does `fcm_token` expect the raw APNs token from `expo-notifications` `getDevicePushTokenAsync()`, or an FCM registration token from Firebase Messaging? (Android sends the native FCM token.) | Phase 5 iOS push registration | Open |
| 2 | Reverb | Private-channel auth endpoint for `business.{id}.chats`; event names; event payloads. | Phase 8 realtime only | Open |
| 3 | Review points | Notifications tab says `review_point_alert` opens `GET /review-points/{id}`, but the Endpoints tab lists only `GET /review-points`. | Phase 6/11 | Open |
| 4 | Pagination | Response shape (page meta) for page-based lists: `GET /google-reviews`, `GET /private-feedback`. | Phase 7 | Open |
| 5 | AI | Which `error.code` does `POST /google-reviews/{id}/ai-reply` return with 402 "AI allowance used up"? | Phase 7 | Open |
| 6 | Push data | `chat_message` data is described as "type, chat id, deep_link" — exact key for the chat id? | Phase 5 | Open |
| 7 | location_id=all | Which endpoints accept `location_id=all` ("Most lists take it")? Dashboard says "location_id optional" — is omitting it the same as all? | Milestone 1 (checked by capture) | Open |
| 8 | Devices | `POST /devices` response shape (device id needed for `DELETE /devices/{id}`). | Phase 5 | Open |
| 9 | Store URLs | `/app-config` `store_urls` are null on both platforms, so the Update screen has no button yet. | Before release | Open |
| 10 | Response shapes | Sheet doesn't define bodies for `/auth/me`, `/locations`, `/business/dashboard`, `/analytics/usage`, `/customers`, `/customers/{id}`, `/customers/{id}/send-attempts`, `/review-requests?customer_id=`, `/auth/refresh`. Captured from the test business with `scripts/capture-responses.mjs`. | Milestone 1 | Waiting for test logins |
| 11 | Google new user | `/auth/google/id-token` with `is_new_user: true` (201) also returns a token. The app shows "Finish setting up on the web" and does not keep the session. Should the app revoke that token (`POST /auth/logout`) or leave it? | Google sign-in | Open |
| 12 | Google OAuth | OAuth clients don't exist yet (`google-services.json` has an empty `oauth_client`; plist has no `CLIENT_ID`/`REVERSED_CLIENT_ID`). Needs Web + iOS + Android (debug, EAS, Play signing SHA-1) client IDs, added on the server too. | Google sign-in | Open |
| 13 | Web app URL | "Open OneTouchReview on the web" — no web URL is documented, so the app shows the message without a link. | — | Open |
