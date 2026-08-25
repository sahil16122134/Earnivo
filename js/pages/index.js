import { auth, isFirebaseConfigured } from "../services/firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { WORKER_BASE_URL } from "../config.js";
import { Api } from "../services/api.js";

// Referral code from a shared link (e.g. index.html?ref=EARN1234ABCD),
// redeemed once after the user is signed in — see completeSignIn().
const referralCode = new URLSearchParams(location.search).get("ref");

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const form = document.getElementById("auth-form");
const submitBtn = document.getElementById("auth-submit");
const googleBtn = document.getElementById("google-signin");
const errorEl = document.getElementById("auth-error");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

let mode = "login"; // "login" | "signup"

const missing = [];
if (!isFirebaseConfigured) missing.push("Firebase Web config (js/services/firebase.js)");
if (WORKER_BASE_URL === "YOUR_REAL_WORKER_URL") missing.push("Worker URL (js/config.js)");

if (missing.length > 0) {
  showError(`Setup needed — configure: ${missing.join(", ")}. See README.md.`);
  form.querySelectorAll("input,button").forEach((el) => (el.disabled = true));
  googleBtn.disabled = true;
} else {
  // If already signed in, skip straight to Home.
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "home.html";
  });
}

tabLogin.addEventListener("click", () => setMode("login"));
tabSignup.addEventListener("click", () => setMode("signup"));

function setMode(next) {
  mode = next;
  tabLogin.classList.toggle("active", mode === "login");
  tabSignup.classList.toggle("active", mode === "signup");
  submitBtn.textContent = mode === "login" ? "Log in" : "Sign up";
  passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
  hideError();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || password.length < 6) {
    showError("Enter a valid email and a password of at least 6 characters.");
    return;
  }

  setBusy(true);
  try {
    const cred = mode === "login"
      ? await signInWithEmailAndPassword(auth, email, password)
      : await createUserWithEmailAndPassword(auth, email, password);
    await completeSignIn(cred.user);
  } catch (err) {
    showError(friendlyAuthError(err));
    setBusy(false);
  }
});

googleBtn.addEventListener("click", async () => {
  hideError();
  setBusy(true);
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await completeSignIn(cred.user);
  } catch (err) {
    showError(friendlyAuthError(err));
    setBusy(false);
  }
});

// After any successful Firebase Auth sign-in, ask the Worker to bootstrap
// (or refresh) the Firestore `users/{uid}` profile document, since the
// client itself isn't allowed to create/write financial fields directly
// (see firestore.rules).
async function completeSignIn(user) {
  const idToken = await user.getIdToken();
  const res = await fetch(`${WORKER_BASE_URL}/auth/ensure-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || "Couldn't finish setting up your account.");
  }
  if (referralCode) {
    // Best-effort: don't block sign-in if this fails (e.g. invalid code,
    // self-referral, or the account was already referred earlier).
    try { await Api.recordReferral(referralCode); } catch (e) {}
  }
  window.location.href = "home.html";
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use") return "An account with this email already exists — try logging in instead.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Incorrect email or password.";
  if (code === "auth/weak-password") return "Choose a password with at least 6 characters.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  return err?.message || "Something went wrong. Please try again.";
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  googleBtn.disabled = busy;
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}
function hideError() {
  errorEl.style.display = "none";
}
