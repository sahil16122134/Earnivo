/** Ledger Light backend: one small Worker entrypoint owns CORS preflight, routing, and safe JSON errors. */
import { corsHeaders, failure, json } from "./http.js";
import { route } from "./routes.js";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    try { return json(request, env, await route(request, env)); }
    catch (error) { return failure(request, env, error); }
  }
};
