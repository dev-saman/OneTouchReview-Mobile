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
| 10 | Response shapes | Sheet didn't define response bodies. | Milestone 1 | Answered 2026-10-07: Endpoints column G "Response example" for all 64 endpoints. Real API output from a temporary **local** test database with made-up data ("Smith Law", Austin), not production and not the test business (99); AI and Google calls were faked. Field names are reliable; values and production behaviour still need checking on the test business. Hand-edited: template text, photo URL, weekly-report AI summary, one removed notification (none are fields the app reads). Email-code and Google sign-in cells point back to row 2 (`/auth/login`) for `user` / `business`. |
| 11 | Google new user | `/auth/google/id-token` with `is_new_user: true` (201) also returns a token. The app shows "Finish setting up on the web" and does not keep the session. Should the app revoke that token (`POST /auth/logout`) or leave it? | Google sign-in | Open |
| 12 | Google OAuth | OAuth clients don't exist yet (`google-services.json` has an empty `oauth_client`; plist has no `CLIENT_ID`/`REVERSED_CLIENT_ID`). Needs Web + iOS + Android (debug, EAS, Play signing SHA-1) client IDs, added on the server too. | Google sign-in | Open |
| 13 | Web app URL | "Open OneTouchReview on the web" — no web URL is documented, so the app shows the message without a link. | — | Open |
| 14 | Not sent | `last_not_sent` on `/customers` and `/customers/{id}` is `null` in every response example, so its fields are unknown. The app only uses it to show a "Not sent" badge; reasons come from `/customers/{id}/send-attempts`. | Clients | Open |
| 15 | Send attempts | `/customers/{id}/send-attempts` example is `{ "attempts": [] }`. The app reads `message` and `source_label` (Endpoints notes). Please add a non-empty example (any date / channel fields?). | Clients | Open |
| 16 | Follow-ups | `/review-requests?customer_id=…&include_follow_ups=1`: `follow_ups` is `[]` in the example. The app lists the requests and marks `is_reminder: true` as "Follow-up"; please confirm whether follow-ups come as separate items or only inside `follow_ups`. | Clients | Open |
| 17 | Dashboard rating | `/business/dashboard` `stats.avg_rating` is `0` when there are no responses (not `null`). The app shows "—" when `total_responses` is 0. Confirm that's intended. | Dashboard | Open |
