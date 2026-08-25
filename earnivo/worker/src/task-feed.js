/** Eligible-task pagination fills a member page while bounding hidden ineligible scans. */
import { cursorValuesFromItem, encodeCursor, normalizePage, stableOrderBy } from "./firestore.js";

export const memberTaskOrder = Object.freeze([{ field: "createdAt", direction: "DESCENDING" }]);
export async function collectEligibleTaskPage({ queryPage, isEligible, cursor = null, limit = 20, scanLimit = 200 }) {
  const requested = normalizePage(limit); const stableOrder = stableOrderBy(memberTaskOrder); const items = []; let nextCursor = cursor; let scanned = 0;
  while (items.length < requested && nextCursor !== null || (scanned === 0 && cursor === null)) {
    if (scanned >= scanLimit) break;
    const page = await queryPage({ cursor: nextCursor, limit: Math.min(50, scanLimit - scanned) });
    if (!page.items.length) return { items, nextCursor: null, scanned };
    scanned += page.items.length;
    for (const task of page.items) { if (isEligible(task)) items.push(task); if (items.length === requested) return { items, nextCursor: encodeCursor(cursorValuesFromItem(stableOrder, task)), scanned }; }
    nextCursor = page.nextCursor;
    if (!nextCursor) break;
  }
  return { items, nextCursor, scanned };
}
