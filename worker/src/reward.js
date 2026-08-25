// Core financial primitives. Every credit/reversal uses a deterministic event key,
// a document-create precondition, and a user update-time precondition so retries
// cannot mint duplicate ledger entries or overwrite concurrent balance changes.
export async function creditReward(firestore, { userId, amountRupees, coinAmount, type, source, provider, providerTransactionId, transactionKey, description, metadata, userFields = {}, userUpdateMask = [], additionalWrites = [] }) {
  if (amountRupees <= 0) throw new AppError("INVALID_AMOUNT", "Reward amount must be positive.");

  const eventKey = transactionKey || providerTransactionId;
  const transactionId = eventKey
    ? `ptx_${await firestore.deterministicId(eventKey)}`
    : crypto.randomUUID();

  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.");
  const user = userMeta.doc;
  const now = new Date().toISOString();
  const coinDelta = coinAmount ?? Math.round(amountRupees * 100);
  const newBalance = (user.balanceRupees || 0) + amountRupees;
  const newCoins = (user.coinBalance || 0) + coinDelta;
  const newTotalEarned = (user.totalEarnedCoins || 0) + coinDelta;

  try {
    await firestore.commit([
      {
        path: `transactions/${transactionId}`,
        data: {
          transactionId, userId, type, source: source || type, provider: provider || null,
          providerTransactionId: providerTransactionId || null,
          eventKey: eventKey || null,
          amountRupees, amountCoins: coinDelta,
          status: "completed", description: description || "", metadata: metadata || {},
          createdAt: now, updatedAt: now,
        },
        condition: eventKey ? { exists: false } : undefined,
      },
      {
        path: `users/${userId}`,
        data: { balanceRupees: newBalance, coinBalance: newCoins, totalEarnedCoins: newTotalEarned, updatedAt: now, ...userFields },
        updateMask: ["balanceRupees", "coinBalance", "totalEarnedCoins", "updatedAt", ...userUpdateMask],
        condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : undefined,
      },
      ...additionalWrites,
    ]);
  } catch (err) {
    if (eventKey && err.code === "PRECONDITION_FAILED") {
      const existing = await firestore.getDoc(`transactions/${transactionId}`);
      if (existing) return { alreadyProcessed: true, transaction: existing };
    }
    throw err;
  }

  return { alreadyProcessed: false, transactionId, newBalance };
}

export async function reverseTransaction(firestore, { originalTransactionId, userId, amountRupees, reason, type = "reward_reversal", coinDelta = null, idempotencyKey, userFields = {}, userUpdateMask = [], additionalWrites = [] }) {
  const now = new Date().toISOString();
  const eventKey = idempotencyKey || `reversal:${originalTransactionId || crypto.randomUUID()}`;
  const transactionId = `rtx_${await firestore.deterministicId(eventKey)}`;
  const userMeta = await firestore.getDocMeta(`users/${userId}`);
  if (!userMeta) throw new AppError("USER_NOT_FOUND", "User not found.");
  const user = userMeta.doc;
  const newBalance = (user.balanceRupees || 0) + amountRupees;
  const effectiveCoinDelta = coinDelta ?? Math.round(amountRupees * 100);
  const newCoins = Math.max((user.coinBalance || 0) + effectiveCoinDelta, 0);

  try {
    await firestore.commit([
      {
        path: `transactions/${transactionId}`,
        data: { transactionId, userId, type, amountRupees, status: "completed", description: reason || "", metadata: { originalTransactionId, eventKey }, createdAt: now, updatedAt: now },
        condition: { exists: false },
      },
      { path: `users/${userId}`, data: { balanceRupees: newBalance, coinBalance: newCoins, updatedAt: now, ...userFields }, updateMask: ["balanceRupees", "coinBalance", "updatedAt", ...userUpdateMask], condition: userMeta.updateTime ? { updateTime: userMeta.updateTime } : undefined },
      ...additionalWrites,
    ]);
  } catch (err) {
    if (err.code === "PRECONDITION_FAILED") {
      const existing = await firestore.getDoc(`transactions/${transactionId}`);
      if (existing) return { alreadyProcessed: true, transactionId, transaction: existing };
    }
    throw err;
  }
  return { alreadyProcessed: false, transactionId, newBalance };
}

export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
