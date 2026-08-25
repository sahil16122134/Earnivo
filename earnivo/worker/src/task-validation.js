/** Task input contract: destinations are HTTPS and country restrictions use normalized ISO-style two-letter codes. */
import { HttpError } from "./http.js";

export function normaliseCountryCode(value, { allowAll = false, allowEmpty = false, fieldName = "Country" } = {}) { const code = String(value || "").trim().toUpperCase(); if (allowEmpty && !code) return ""; if (allowAll && code === "ALL") return "all"; if (!/^[A-Z]{2}$/.test(code)) throw new HttpError(400, `${fieldName} must be a two-letter ISO-style country code${allowAll ? " or all" : ""}.`, "invalid_country_code"); return code; }
export function tryNormaliseCountryCode(value, options = {}) { try { return normaliseCountryCode(value, options); } catch { return null; } }
export function normaliseHttpsDestination(value) { const raw = String(value || "").trim(); let url; try { url = new URL(raw); } catch { throw new HttpError(400, "Task destination must be a valid HTTPS URL.", "invalid_task_destination"); } if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new HttpError(400, "Task destination must be a valid HTTPS URL without embedded credentials.", "invalid_task_destination"); return url.toString(); }
export function normaliseOptionalHttpsDestination(value) { return String(value || "").trim() ? normaliseHttpsDestination(value) : ""; }
export function isHttpsDestination(value) { try { normaliseHttpsDestination(value); return true; } catch { return false; } }
