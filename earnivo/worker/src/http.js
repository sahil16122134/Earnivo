/** Ledger Light backend: CORS is explicit, responses are structured, and errors never expose secrets. */
export class HttpError extends Error {
  constructor(status, message, code = "request_failed") { super(message); this.status = status; this.code = code; }
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? origin : allowed[0] || "";
}

export function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Postback-Timestamp, X-Postback-Signature",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export function json(request, env, data, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) } });
}

export function failure(request, env, error) {
  const known = error instanceof HttpError;
  const status = known ? error.status : 500;
  const body = { error: { code: known ? error.code : "internal_error", message: known ? error.message : "An unexpected server error occurred." } };
  console.error("Earnivo Worker error", known ? body : error?.stack || error);
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) } });
}

export async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) throw new HttpError(415, "Send a JSON request body.", "invalid_content_type");
  try { return await request.json(); } catch { throw new HttpError(400, "The request body is not valid JSON.", "invalid_json"); }
}

export function methodNotAllowed() { throw new HttpError(405, "This method is not allowed for the requested endpoint.", "method_not_allowed"); }
