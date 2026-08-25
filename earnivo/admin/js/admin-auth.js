/** Ledger Light admin: administrator pages wait for Firebase restoration and Worker role authorization before rendering. */
import { requireUser } from "../../js/auth.js";
export async function requireAdmin() { return requireUser({ admin: true }); }

