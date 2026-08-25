# Earnivo End-to-End Test Plan

This release uses Firebase Authentication, a Cloudflare Worker for every privileged operation, and Firestore only through the Worker. Execute the following cases against non-production accounts after deploying Firestore indexes and configuring Worker secrets.

| Area | Required checks |
| --- | --- |
| Authentication | Signup, invalid referral, valid referral, login, wrong-password feedback, logout, session restoration, member-page redirect with `next`, and admin-route protection. |
| Profile and eligibility | Save a two-letter country code, reject invalid codes, exercise mobile/desktop/tablet preference fallback, and confirm country/device-restricted tasks are withheld and cannot be manually started. |
| Tasks and submissions | Create/edit valid tasks; reject invalid rewards, dates, HTTPS destinations, countries, and device values; hide/disable/expire without deletion; start once; attempt concurrent duplicate starts; submit proof; approve, reject, and retry an already-settled review. |
| Rewards and limits | Verify approval atomically changes submission state, wallet verification and available amounts, task `completions`, campaign counters, daily counters, reward transaction, and exactly one member notification. Exercise cap and budget exhaustion. |
| Withdrawals | Reject below-minimum, disabled-method, invalid-reference, insufficient-balance, daily-limit, and concurrent requests. Verify valid request, approval, rejection/reversal, paid transition, active-withdrawal release, and transaction states. |
| Referrals and notifications | Test self and duplicate rejection, pending-to-verified qualification, one referral transaction, referrer notification, direct recipient feed, unread badge, read action, and pagination. |
| Administration and postbacks | Confirm non-admin denial; verify super-admin-only role changes; audit every sensitive action; exercise HMAC timestamp, provider/task, duplicate transaction, and terminal postback handling. |
| Responsive/accessibility | Check member and admin pages at 320, 360, 390, 412, 768, 1024, and 1440 pixels for overflow, focus visibility, touch targets, modal behavior, readable status text, empty states, and meaningful errors. |

> Do not treat an approval as a paid withdrawal. Confirm payment only through the explicit `approved → paid` action and provider reference.
