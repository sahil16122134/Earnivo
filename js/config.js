// ─────────────────────────────────────────────────────────────────────────
// CENTRAL CONFIGURATION — the only place the Cloudflare Worker URL is set.
// Every other file imports WORKER_BASE_URL from here instead of hardcoding it.
//
// After you deploy the Worker with `wrangler deploy`, Cloudflare prints a URL
// like:
//   https://earnivo-worker.<your-subdomain>.workers.dev
// (or your own custom domain if you attached one in the Cloudflare dashboard).
//
// Paste that exact URL below, with no trailing slash.
// ─────────────────────────────────────────────────────────────────────────
export const WORKER_BASE_URL = "https://earnivo-worker.sahilsirsat09.workers.dev"; // e.g. "https://earnivo-worker.your-subdomain.workers.dev"

