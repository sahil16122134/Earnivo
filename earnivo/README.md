# Earnivo

Earnivo is a mobile-first task and rewards platform with a vanilla ES-module frontend, Firebase Authentication and Firestore, and a Cloudflare Worker that performs privileged operations.

> **Security boundary:** Firebase Web configuration may be placed in `js/config.js`; it is not a secret. Service-account credentials and Worker secrets must never be committed to this repository or placed in browser files.

## Project layout

| Area | Purpose |
| --- | --- |
| `pages/` | User-facing application pages. |
| `admin/` | Protected administrator workspace. |
| `js/` | Browser modules, Firebase session handling, components, and page controllers. |
| `worker/` | Cloudflare Worker API for privileged Firestore access and administration. |
| `css/` | Split, page-focused stylesheets built around the Ledger Light design system. |
| `firestore.rules` | Least-privilege browser rules. |

## Configure Firebase

Create a Firebase web application, enable **Email/Password** sign-in, and create Firestore. Copy the public web configuration into `js/config.js`. The same file contains the URL of your deployed Worker.

Deploy the rules and indexes after signing in to the Firebase CLI:

```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

## Configure the Worker

Inside `worker/`, install the development dependency and configure a Cloudflare Worker:

```bash
npm install
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put SERVICE_ACCOUNT_EMAIL
npx wrangler secret put SERVICE_ACCOUNT_PRIVATE_KEY
npx wrangler secret put ADMIN_EMAILS
npx wrangler secret put POSTBACK_HMAC_SECRET
npx wrangler deploy
```

`SERVICE_ACCOUNT_PRIVATE_KEY` must include the full PEM content, with newlines preserved. `ADMIN_EMAILS` is a comma-separated allowlist for initial administration. `POSTBACK_HMAC_SECRET` is required before accepting provider callback traffic. For provider-specific secrets, configure `PROVIDER_HMAC_SECRETS` as a Worker secret containing a JSON map of provider document IDs to HMAC keys. Set `ALLOWED_ORIGINS` and `PUBLIC_APP_URL` in `worker/wrangler.toml` to the deployed Cloudflare Pages domain, then set `WORKER_API_URL` in `js/config.js` to the Worker URL.

## Configure Cloudflare Pages

Create a Pages project from this repository with the repository root as the build output directory. No build command is required because the frontend is static. The Worker and Pages project can use separate domains; `worker/src/http.js` contains the allowed-origin configuration.

## Local development

Serve the repository root with any static web server and run the Worker independently:

```bash
cd worker
npm install
npm run dev
```

Use the Worker URL printed by the local development command in `js/config.js`. The application presents a clear configuration error rather than making fake API calls when Firebase or the Worker URL has not been configured.

## Operational notes

The Worker verifies Firebase ID tokens, applies administrator authorization, writes audit logs, and calls Firestore via a short-lived Google OAuth access token generated from Worker secrets. The browser never receives a Firebase service-account credential. Task eligibility, limits, submissions, approvals, wallet credits, and withdrawals are all evaluated by the Worker. Device-restricted tasks are evaluated from the current request’s Client Hint or User-Agent signal, with the stored device preference used only when a request signal is unavailable. When the device cannot be resolved, restricted tasks are withheld. Active submissions use a server-side lock, submission completion reserves the reward while it is in verification, and review decisions are guarded against concurrent record changes.

The starter repository contains no customer reviews, seeded earnings, or fake payments. Operational task, wallet, and transaction records come only from configured Firebase/Worker interactions.

> **Campaign caps:** The administrator’s **Campaign completion cap** is stored in the legacy `userLimit` field for backward compatibility, but it is now enforced globally. A valid task start reserves one campaign slot atomically. Approving a submission converts that reservation into a completion; rejecting it releases the slot. This prevents the completed-submission count from exceeding the configured campaign cap.

> **Daily caps:** The administrator’s **Daily completion cap** is a global UTC-day limit, not a per-member limit. It is applied when a verified submission is approved, at the same time as the reward credit. A per-campaign, per-day counter is created or incremented atomically, so approved completions cannot exceed the configured daily cap even under concurrent review activity.

> **Campaign reward budget:** `maximumReward` is the campaign’s total reward budget. Each task start reserves the base `reward` amount. Approval converts the reservation into a credited reward; rejection releases it. The Worker persists campaign-level paid and reserved reward totals atomically with the submission decision, so the cumulative credited reward cannot exceed `maximumReward`.

> **Atomic campaign counters:** Every task has a dedicated `campaignCounters/{campaign_<taskId>}` record that holds completed, reserved, paid, and reserved-reward totals. Task creation creates this record atomically with the task. A task start atomically creates a member lock, creates a submission, and reserves one counter slot. Later approvals and rejections settle the same counter with an update-time precondition. A legacy task without a counter is migrated once through an `exists: false` counter create; concurrent migration attempts cannot both succeed.

> **Referral lifecycle:** An invitation URL carries `?ref=CODE` into signup. Bootstrap validates the code against the server-maintained `referralCodes` index, then stores an immutable `referredBy` relationship with `referralStatus: pending`. Each approved qualifying task advances the invited member’s qualification counter. At the configured threshold, an atomic submission approval marks the relationship verified and credits the referrer with one deterministic `referral_<memberId>` transaction. A preconditioned user update prevents duplicate referral crediting.

> **Withdrawal states:** A withdrawal begins as `pending`. An administrator may move it to `approved` after operational review, but this does **not** claim that money was sent. Only `approved → paid`, accompanied by a payout-provider reference, records a completed payment. `pending → rejected` returns the held balance to the member; `paid` and `rejected` are terminal states.

> **Administrative write policy:** Generic administration routes are read-only. Tasks, providers, notifications, platform settings, user roles, account suspension, balance adjustments, fraud review, submission decisions, and withdrawal transitions each have constrained resource-specific handlers. Financial records, submissions, withdrawals, fraud cases, and logs cannot be arbitrarily patched, created, or deleted through a generic endpoint.

> **Super-administrator delegation:** `ADMIN_EMAILS` is the super-administrator allowlist. Allowlisted identities can access administration even if their profile role has not yet been delegated, and they alone may grant or revoke an ordinary administrator role. Ordinary administrators may perform permitted operational actions, but they cannot change administrator roles. Configure at least one controlled, monitored mailbox in `ADMIN_EMAILS` before deployment.

> **Pagination contract:** High-volume list endpoints use Firestore structured queries with a stable descending `createdAt` or `startedAt` order plus an explicit final document-name tie-breaker, a bounded default page size of 20, a maximum page size of 50, and an opaque `nextCursor` containing every ordering value. Member transactions, active submissions, notifications, referrals, and administrator tables no longer load a 500-record collection scan. The member task feed scans forward through bounded active-task pages until it fills the requested eligible page, reaches the end, or reaches its safe scan budget; an ineligible first storage page cannot make later eligible tasks disappear. Provision the composite indexes in `firestore.indexes.json` before release.

> **Legacy counter note:** A campaign created before dedicated `campaignCounters` existed is seeded once from its historical submissions the first time it is started or settled. This bounded compatibility path is not used after its counter record is created. All normal member, dashboard, notification, referral, and administrator list reads use indexed query pages.

> **Task dates:** Task dates are persisted as complete UTC ISO timestamps. The Worker accepts a date-only start value as `00:00:00.000Z` and a date-only expiry as `23:59:59.999Z`, so a campaign selected to expire on a calendar day remains available throughout that full UTC day. Invalid or inverted ranges are rejected before persistence.

> **Task destinations and countries:** A task’s start destination is optional; when supplied, it must be an absolute `https://` URL with a hostname and no embedded credentials. This is checked by the Worker when a task is created or edited and again before a member can start the task. Country restrictions and profile countries are normalized to uppercase two-letter codes, such as `IN`; unrestricted tasks use `all`. This prevents case and display-name differences from changing eligibility.

> **Task retention:** Published task documents are permanent history. The platform does not physically delete them, even when there are no current submissions. Administrators retire availability through `active`, `hidden`, `disabled`, or `expired` status transitions, preserving linked submissions, transaction references, campaign counters, and audit records.

> **Provider postbacks:** Providers must send JSON with `providerId`, `transactionId`, `submissionId`, `taskId`, and `status`, plus `X-Postback-Timestamp` (Unix seconds) and `X-Postback-Signature` (`sha256=` optional). The signature is HMAC-SHA256 of `timestamp + "." + raw JSON body`. Tasks store the active provider document ID, and the task editor permits only active-provider selections. Postbacks older than the configured window are rejected unless that provider ID matches the campaign exactly. A preliminary `verification` event never consumes a provider transaction ledger identity. A terminal `approved`, `rejected`, `cancelled`, or `reversed` outcome creates `providerTransactions/{providerId}__{providerTransactionId}` with an `exists: false` precondition in the same settlement commit. Exact duplicate terminal callbacks return `alreadyProcessed`; conflicting reuse is rejected. Completed reward reversals require a separately controlled financial recovery workflow and are not silently clawed back.

> **Notifications:** Each notification is an inbox record with an explicit `userId` and `createdAt`. The member feed queries only `where userId == currentUserId`, ordered by creation time with an opaque cursor; it never downloads a broad notification collection and filters it in application code. The built-in administrator tool sends direct notifications. Use an approved background delivery workflow if you later need high-volume broadcast fan-out.

> **Withdrawal policy:** Platform settings may define a minimum amount, a daily requested-amount limit, and enabled payout methods. The Worker validates those settings and every request, reserves the day’s amount atomically with the wallet, withdrawal, transaction, and active-withdrawal lock, and releases the single-active lock only on terminal rejection or payment. Approval is a review action that moves a held balance from pending to approved; it is not a payment confirmation.

> **Signup and settings safety:** Referral attribution is validated before Worker profile and wallet creation. If a newly created Firebase Auth account cannot complete bootstrap—for example, because the referral is invalid—the browser immediately deletes that just-created Auth user so the member can correct the error and retry. The administrator settings screen distinguishes a genuine missing first configuration record from a failed settings read; failures show a blocking warning and do not present an empty form that could overwrite unknown settings.

> **Notification state:** New operational, task-review, and referral notifications include a direct recipient, category, `createdAt`, `unread`, and `readAt`. The navigation badge uses a recipient-scoped unread aggregation, and the member inbox marks only the signed-in recipient’s individual messages as read.

> **Referral scale:** Referral history is queried directly from `users` by `referredBy`, ordered by `createdAt` and paged with an opaque cursor. Pending and verified totals use Firestore aggregation counts constrained by the same `referredBy` field plus `referralStatus`; they do not depend on the size of a fetched user page or a bounded user-list scan.

## Suggested improvements

| Priority | Improvement | Why it matters | Practical first step |
| --- | --- | --- | --- |
| High | Add server-side paginated Firestore queries | The current operational lists intentionally cap records for a clean starter implementation; production-scale queues need indexed, cursor-based retrieval. | Add Firestore composite indexes and cursor parameters to the Worker list endpoints. |
| High | Integrate a verified payout provider | Withdrawal approval records an operational decision but does not issue a payment by itself. | Add a provider-specific Worker adapter that creates a payout only after admin approval, stores a provider reference, and handles signed callbacks. |
| Medium | Add secure proof-file storage | The current proof flow accepts a text reference, which is suitable for links and codes but not document uploads. | Add protected storage with MIME, size, malware-scanning, and retention controls before accepting files. |
| Medium | Add monitoring and alerting | Administrative audit logs support review but do not actively notify operators of unusual operational patterns. | Send rate-limited alerts for repeated failed submissions, rejected payouts, and Worker errors to an approved operations channel. |

> **Release gate:** Before inviting members, set supported countries in **Admin → Settings**, configure the Firebase and Worker values, exercise the proof and withdrawal flow with non-production test accounts, and have an authorized operator review the fraud and payout processes.
