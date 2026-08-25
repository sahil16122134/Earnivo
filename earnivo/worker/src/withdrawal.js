/** Withdrawal states intentionally separate operational approval from confirmation that money was actually sent. */
const transitions = { pending: { approve: "approved", reject: "rejected" }, approved: { paid: "paid" }, rejected: {}, paid: {} };

export function nextWithdrawalStatus(status, action) { return transitions[status]?.[action] || null; }
export function allowedWithdrawalActions(status) { return Object.keys(transitions[status] || {}); }

