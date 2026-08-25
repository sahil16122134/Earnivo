import { AppError } from "./reward.js";

export function corsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  // Only echo back the request's Origin if it's actually on the allowed
  // list. Falling back to the first configured origin (as this used to do)
  // meant a disallowed origin would still get a "successful-looking" CORS
  // header — just one that points at the wrong origin, which the browser
  // would still correctly block, but produces confusing symptoms once more
  // than one origin is configured. An empty string here means "no CORS
  // header value", i.e. the browser will reject the response.
  const allowOrigin = allowed.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data, init = {}) {
  return new Response(JSON.stringify({ success: true, data }), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export function jsonError(err, init = {}) {
  const status = err instanceof AppError ? err.status : init.status || 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message = err instanceof AppError ? err.message : "Something went wrong. Please try again.";
  // Never leak stack traces to the client.
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

// Very small fixed-window limiter using Workers KV-less in-memory map per
// isolate. For real production traffic, replace with Cloudflare's native
// Rate Limiting binding (see wrangler.toml) or a Durable Object/KV counter,
// since this in-memory map resets on every isolate recycle.
const buckets = new Map();
export function rateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  buckets.set(key, entry);
  return entry.count <= limit;
}
