// Verifies Firebase Auth ID tokens sent from the frontend as
// `Authorization: Bearer <idToken>`. Uses Google's public JWKS — no Admin SDK
// or Cloud Functions required, so this works on Firebase Spark.
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function verifyIdToken(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    // payload.sub is the Firebase UID.
    return { uid: payload.sub, claims: payload };
    } catch (e) {
    console.error("[FirebaseAuth] token verification failed:", e?.message || e);
    return null;
  }
}

// Confirms the caller is an admin by checking their Firestore user document's
// `role` field server-side. Never trust a client-supplied `role` or `admin`
// flag — always re-derive it here.
export async function requireAdmin(request, env, firestore) {
  const auth = await verifyIdToken(request, env);
  if (!auth) return { ok: false, status: 401, error: "UNAUTHENTICATED" };

  const userDoc = await firestore.getDoc(`users/${auth.uid}`);
  if (!userDoc || userDoc.role !== "admin") {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true, uid: auth.uid };
}
