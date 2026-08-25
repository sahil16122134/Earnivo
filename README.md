# Earnivo

Static frontend (GitHub Pages) + Firebase Spark (Auth/Firestore) + Cloudflare
Worker (secure business logic). No Firebase Blaze, no Cloud Functions.

**Architecture**
```
GitHub Pages (frontend)
   → Firebase Auth (sign-in)
   → Firestore (safe reads only: own profile, public tasks, own notifications)
   → Cloudflare Worker (everything sensitive: rewards, withdrawals, admin)
        → Firestore REST API (service-account JWT, Spark-compatible)
Providers (surveys/offers/ads) → Worker postback endpoints → Firestore
```
The frontend never writes balance, coins, role, transactions, or withdrawal
documents directly — `firestore.rules` blocks this, and the Worker's
`reward.js` is the only path that credits/debits, always with a paired
ledger transaction.

## 1. GitHub Pages setup
Push this repo to GitHub, then **Settings → Pages → Source: Deploy from
branch → `main` / `/ (root)`**. The site root already contains `index.html`,
so no directory selection is needed.

## 2. Firebase Spark setup
Create a project at console.firebase.google.com (Spark plan is fine).
Enable **Authentication** and **Firestore Database**.

## 3. Firebase Web config
Firebase Console → ⚙️ Project Settings → General → "Your apps" → add a Web
app → copy the config object into `js/services/firebase.js` (replace the six
`REPLACE_ME` values). This is public client config, not a secret.

## 4. Firestore rules
Deploy the included rules (blocks direct client writes to financial fields):
```
firebase deploy --only firestore:rules
```

## 5. Firestore indexes
Deploy the included composite indexes (required by the app's `where` +
`orderBy` queries):
```
firebase deploy --only firestore:indexes
```

## 6. Cloudflare Worker deployment
```
cd worker
npm install
npm run deploy
```
Wrangler prints your Worker URL, e.g. `https://earnivo-worker.<subdomain>.workers.dev`.

## 7. Worker secrets
Set these (never in `wrangler.toml`, never in the repo):
```
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put POSTBACK_SECRET
wrangler secret put AD_PROVIDER_VERIFY_SECRET
# Set the verification API endpoint as a non-secret variable in wrangler.toml:
# AD_PROVIDER_VERIFY_URL = "https://your-ad-provider.example/verify"
```
`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` come from a service account
JSON: Firebase Console → Project Settings → Service Accounts → Generate new
private key.

## 8. Worker URL configuration
Paste your deployed Worker URL into the **one** place it's defined:
`js/config.js` → `WORKER_BASE_URL`. Every page (user + admin) imports it from
there — nothing else to edit.

## 9. CORS origin configuration
In `worker/wrangler.toml` → `[vars]` → `ALLOWED_ORIGIN`, set your real GitHub
Pages origin, e.g. `https://yourusername.github.io` (or your custom domain).
Comma-separate a local dev origin if needed:
`"https://yourusername.github.io,http://localhost:5500"`. Redeploy the Worker
after changing this.

## 10. Firebase Authentication configuration
The site uses the Firebase Auth SDK directly (no third-party login widget).
1. Firebase Console → **Authentication → Sign-in method** → enable
   **Email/Password**, and enable **Google** if you want the "Continue with
   Google" button to work (add your GitHub Pages origin under Google's
   "Authorized domains" — Firebase adds `*.firebaseapp.com` automatically).
2. That's it on the frontend — `js/pages/index.js` calls the Firebase Auth
   SDK's `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` /
   `signInWithPopup` directly. No bot, no token, no widget script.
3. After any successful sign-in, the frontend calls the Worker's
   `POST /auth/ensure-user` (with the user's Firebase ID token) once, which
   creates the Firestore `users/{uid}` profile document the first time —
   the client itself cannot create that document (see `firestore.rules`).

## 11. Provider postback configuration
Give each survey/offer/ad network a postback URL pointing at the matching
Worker endpoint (`/survey/postback`, `/offer/postback`, `/adsgram/postback`,
or the generic `/provider/postback`). Use the provider-specific secret query
parameter documented in `worker/src/postbacks.js`; do not assume every provider
uses the generic secret. Rewarded-ad claims are disabled unless
`AD_PROVIDER_VERIFY_URL` is configured and the Worker can validate the supplied
provider token using `AD_PROVIDER_VERIFY_SECRET`. Adjust the field names read in
`worker/src/postbacks.js` to match each network's actual callback schema —
the current mapping (`user_id`/`subid`, `transaction_id`/`tx_id`,
`payout`/`amount`) is a generic starting point.

## 12. Admin setup
After an admin-to-be signs in once, open Firestore console → `users/{uid}` →
set `role: "admin"`. This field can never be set by the client itself (see
`firestore.rules`), so it must be set manually the first time. The Worker
re-verifies this role server-side on every `/admin/*` and other privileged
request — the admin UI at `/admin/` is convenience, not the security
boundary.

## Known placeholders you must fill in
- `js/services/firebase.js` — Firebase Web config (6 fields)
- `js/config.js` — `WORKER_BASE_URL`
- `worker/wrangler.toml` — `ALLOWED_ORIGIN`
- `worker/src/postbacks.js` — real field names per provider
- `worker/src/admin.js` — `handleAdminStats()` uses a placeholder revenue
  margin assumption; replace with real provider cost data once available
