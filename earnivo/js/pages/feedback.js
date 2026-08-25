/** Ledger Light feedback controller: authenticated, duplicate-safe product feedback submission. */
import { requireUser } from "../auth.js";
import { api } from "../api.js";
import { $, setLoading } from "../utils.js";
import { toast } from "../components/toast.js";
import { mountNavbar } from "../components/navbar.js";

const feedbackForm = $("#feedback-form");
if (feedbackForm) try { const user = await requireUser(); if (user) { await mountNavbar("profile"); feedbackForm.addEventListener("submit", async (event) => { event.preventDefault(); const errorNode = $(".form-error", feedbackForm); const button = $("button[type='submit']", feedbackForm); errorNode.hidden = true; if (!feedbackForm.reportValidity() || button.disabled) return; try { setLoading(button, true, "Sending…"); await api.post("/v1/feedback", Object.fromEntries(new FormData(feedbackForm))); feedbackForm.reset(); toast("Your feedback has been recorded.", "success"); } catch (error) { errorNode.textContent = error.message; errorNode.hidden = false; } finally { setLoading(button, false); } }); } } catch (error) { toast(error.message, "error"); }
