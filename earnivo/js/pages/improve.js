/** Ledger Light design: this controller supports concise, accountable account entry and feedback submission. */
import { signInWithEmail, registerWithEmail, requireUser } from "../auth.js";
import { api } from "../api.js";
import { $, setLoading } from "../utils.js";
import { toast } from "../components/toast.js";
import { mountNavbar } from "../components/navbar.js";

const authForm = $("#auth-form");
if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorNode = $(".form-error", authForm);
    const button = $("button[type='submit']", authForm);
    errorNode.hidden = true;
    if (!authForm.reportValidity()) return;
    try {
      setLoading(button, true, authForm.dataset.authMode === "signup" ? "Creating account…" : "Signing in…");
      const { email, password } = Object.fromEntries(new FormData(authForm));
      const credentials = authForm.dataset.authMode === "signup" ? await registerWithEmail(email, password) : await signInWithEmail(email, password);
      if (authForm.dataset.authMode === "signup") { const referralCode = new URLSearchParams(location.search).get("ref") || ""; await api.post("/v1/users/bootstrap", { email: credentials.user.email, referralCode }); }
      const next = new URLSearchParams(location.search).get("next") || "/pages/home.html";
      window.location.assign(next);
    } catch (error) {
      errorNode.textContent = error.message;
      errorNode.hidden = false;
      setLoading(button, false);
    }
  });
}

const feedbackForm = $("#feedback-form");
const referralIntent = $("#referral-intent");
if (referralIntent) { const code = new URLSearchParams(location.search).get("ref"); if (code) { referralIntent.hidden = false; referralIntent.textContent = `Invitation code ${code.toUpperCase()} will be validated when you create your account.`; } }
if (feedbackForm) {
  try {
    const user = await requireUser();
    if (user) {
      await mountNavbar("profile");
      feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const errorNode = $(".form-error", feedbackForm);
        const button = $("button[type='submit']", feedbackForm);
        errorNode.hidden = true;
        if (!feedbackForm.reportValidity()) return;
        try {
          setLoading(button, true, "Sending…");
          await api.post("/v1/feedback", Object.fromEntries(new FormData(feedbackForm)));
          feedbackForm.reset();
          toast("Your feedback has been recorded.", "success");
        } catch (error) {
          errorNode.textContent = error.message;
          errorNode.hidden = false;
        } finally { setLoading(button, false); }
      });
    }
  } catch (error) { toast(error.message, "error"); }
}
