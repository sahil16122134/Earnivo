import { auth, getUserProfile } from "../services/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { renderNav, initTheme } from "../nav.js";
import { renderFooter } from "../footer.js";
import { Modal } from "../components/modal.js";
import "../components/ad-slot.js";

renderNav("profile");
initTheme();
renderFooter();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  document.getElementById("profile-uid").textContent = `ID: ${user.uid.slice(0, 10)}…`;
  if (user.photoURL) document.getElementById("profile-avatar").src = user.photoURL;

  // Prefer the Firestore profile's name/photo — the Firebase Auth SDK's
  // user.displayName/photoURL are only auto-populated for providers like
  // Google, not for email/password sign-up.
  document.getElementById("profile-name").textContent = user.displayName || "Earnivo user";
  try {
    const profile = await getUserProfile(user.uid);
    if (profile?.displayName) document.getElementById("profile-name").textContent = profile.displayName;
    if (!user.photoURL && profile?.profilePhoto) document.getElementById("profile-avatar").src = profile.profilePhoto;
  } catch (e) {
    // Keep the Auth-SDK fallback already rendered above.
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  const confirmed = await Modal.confirm({
    title: "Sign out?",
    message: "You'll need to sign in again to continue earning.",
    confirmText: "Sign out",
    cancelText: "Cancel",
    tone: "warning",
  });
  if (!confirmed) return;
  await signOut(auth);
  window.location.href = "index.html";
});
