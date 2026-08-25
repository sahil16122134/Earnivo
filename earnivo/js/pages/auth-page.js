/** Ledger Light auth controller: account entry, referral bootstrap, and cleanup of an account if bootstrap cannot complete. */
import { deleteAuthUser, signInWithEmail, registerWithEmail } from "../auth.js";
import { api } from "../api.js";
import { $, setLoading } from "../utils.js";
import { safeNextPath, shouldRollbackSignup, signupBootstrapPayload } from "../testing/behavior-contracts.js";

const authForm = $("#auth-form");
const referralIntent = $("#referral-intent");
if (referralIntent) { const code = new URLSearchParams(location.search).get("ref"); if (code) { referralIntent.hidden = false; referralIntent.textContent = `Invitation code ${code.toUpperCase()} will be validated when you create your account.`; } }
if (authForm) authForm.addEventListener("submit", async (event) => { event.preventDefault(); const errorNode = $(".form-error", authForm); const button = $("button[type='submit']", authForm); const mode = authForm.dataset.authMode; let createdUser = null; errorNode.hidden = true; if (!authForm.reportValidity()) return; try { setLoading(button, true, mode === "signup" ? "Creating account…" : "Signing in…"); const { email, password } = Object.fromEntries(new FormData(authForm)); const credentials = mode === "signup" ? await registerWithEmail(email, password) : await signInWithEmail(email, password); if (mode === "signup") { createdUser = credentials.user; const referralCode = new URLSearchParams(location.search).get("ref") || ""; await api.post("/v1/users/bootstrap", signupBootstrapPayload({ email: credentials.user.email, referralCode })); } window.location.assign(safeNextPath(new URLSearchParams(location.search).get("next"))); } catch (error) { if (shouldRollbackSignup(mode, createdUser)) { try { await deleteAuthUser(createdUser); } catch (cleanupError) { console.error("Could not remove incomplete signup account", cleanupError); } } errorNode.textContent = error.message; errorNode.hidden = false; } finally { setLoading(button, false); } });
