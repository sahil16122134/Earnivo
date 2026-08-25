import { creditReward, reverseTransaction, AppError } from "./reward.js";
import { json } from "./http.js";

function mapProviderToType(providerName) {
  if (providerName.includes("survey")) return "survey";
  if (providerName.includes("offer")) return "offer";
  if (providerName.includes("ad")) return "ad";
  return "offer";
}

async function findLinkedSubmission(firestore, { userId, taskId, submissionId, attemptId }) {
  let linkedMeta = submissionId ? await firestore.getDocMeta(`taskSubmissions/${submissionId}`) : null;
  if (!linkedMeta && attemptId) {
    const matches = await firestore.runQuery("taskSubmissions", { where: [["providerAttemptId", "EQUAL", attemptId]], limit: 2 });
    const candidate = matches.find((s) => s.userId === userId && (!taskId || s.taskId === taskId));
    linkedMeta = candidate ? await firestore.getDocMeta(`taskSubmissions/${candidate.id}`) : null;
  }
  return linkedMeta;
}

async function handleProviderPostback(request, env, firestore, { providerName, secretParam = "secret", secretEnvVar = "POSTBACK_SECRET" }) {
  const url = new URL(request.url);
  const expectedSecret = env[secretEnvVar] || env.POSTBACK_SECRET;
  const secret = url.searchParams.get(secretParam);
  if (!secret || !expectedSecret || secret !== expectedSecret) throw new AppError("INVALID_SECRET", "Invalid postback secret.", 401);

  const userId = url.searchParams.get("user_id") || url.searchParams.get("subid");
  const providerTransactionId = url.searchParams.get("transaction_id") || url.searchParams.get("tx_id");
  const amountRupees = Number(url.searchParams.get("payout") || url.searchParams.get("amount") || 0);
  const status = String(url.searchParams.get("status") || "completed").toLowerCase();
  const taskId = url.searchParams.get("task_id");
  const submissionId = url.searchParams.get("submission_id");
  const attemptId = url.searchParams.get("attempt_id") || url.searchParams.get("attempt");
  if (!userId || !providerTransactionId || !Number.isFinite(amountRupees) || amountRupees <= 0) throw new AppError("INVALID_PAYLOAD", "Missing required postback fields.");
  if (taskId && !submissionId && !attemptId) throw new AppError("MISSING_ATTEMPT_ID", "Provider callback must identify the task attempt.", 400);

  const user = await firestore.getDoc(`users/${userId}`);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", 404);

  const linkedMeta = (taskId || submissionId || attemptId) ? await findLinkedSubmission(firestore, { userId, taskId, submissionId, attemptId }) : null;
  if ((taskId || submissionId) && !linkedMeta) throw new AppError("SUBMISSION_NOT_FOUND", "Provider callback arrived before the task submission was created.", 409);
  const linked = linkedMeta?.doc;
  if (linked && (linked.userId !== userId || (taskId && linked.taskId !== taskId) || (attemptId && linked.providerAttemptId !== attemptId))) throw new AppError("INVALID_LINK", "Provider callback does not match the submission attempt.", 400);

  const eventKey = linked ? `submission:${linked.id}` : `provider:${providerName}:${providerTransactionId}`;
  const originalEventKey = linked ? eventKey : providerTransactionId;
  const originalId = `ptx_${await firestore.deterministicId(originalEventKey)}`;

  if (status === "chargeback" || status === "reversal") {
    const originalMeta = await firestore.getDocMeta(`transactions/${originalId}`);
    if (!originalMeta || originalMeta.doc.status !== "completed") return json({ handled: true, type: "reversal", reversed: false });
    const result = await reverseTransaction(firestore, {
      originalTransactionId: originalId,
      userId,
      amountRupees: -Math.abs(originalMeta.doc.amountRupees),
      reason: `${providerName} chargeback — ${providerTransactionId}`,
      type: `${mapProviderToType(providerName)}_reversal`,
      idempotencyKey: `chargeback:${eventKey}`,
      additionalWrites: [{
        path: `transactions/${originalId}`,
        data: { ...originalMeta.doc, status: "reversed", updatedAt: new Date().toISOString() },
        condition: originalMeta.updateTime ? { updateTime: originalMeta.updateTime } : undefined,
      }],
    });
    return json({ handled: true, type: "reversal", reversed: !result.alreadyProcessed, alreadyProcessed: !!result.alreadyProcessed });
  }

  if (linked) {
    const existingSubmissionTransaction = await firestore.getDoc(originalId);
    if (existingSubmissionTransaction?.status === "completed") return json({ handled: true, alreadyProcessed: true, transactionId: originalId });
    if (linked.status === "completed") throw new AppError("ALREADY_COMPLETED", "This submission has already been paid.", 409);
    if (linked.status !== "verification" && linked.status !== "in_progress") throw new AppError("INVALID_STATE", "The linked submission is not rewardable.", 409);
    const task = linked.taskId ? await firestore.getDoc(`tasks/${linked.taskId}`) : null;
    const expectedReward = Number(task?.providerRewardRupees ?? linked.providerRewardRupees ?? linked.rewardRupees ?? 0);
    const maxReward = Number(task?.maxRewardRupees ?? linked.maxRewardRupees ?? 0);
    if (!Number.isFinite(expectedReward) || expectedReward <= 0 || Math.round(amountRupees * 100) !== Math.round(expectedReward * 100)) throw new AppError("REWARD_MISMATCH", "Provider payout does not match the server-side task reward.", 409);
    if (maxReward > 0 && amountRupees > maxReward) throw new AppError("REWARD_LIMIT_EXCEEDED", "Provider payout exceeds the task maximum reward.", 409);

    const now = new Date().toISOString();
    const additionalWrites = [{
      path: `taskSubmissions/${linked.id}`,
      data: { ...linked, status: "completed", completedTransactionKey: eventKey, updatedAt: now },
      condition: linkedMeta.updateTime ? { updateTime: linkedMeta.updateTime } : undefined,
    }];
    if (linked.userSlotId) additionalWrites.push({ path: `taskUserSlots/${linked.userSlotId}`, delete: true, condition: { exists: true } });
    if (linked.dailySlotId) additionalWrites.push({ path: `taskDailySlots/${linked.dailySlotId}`, delete: true, condition: { exists: true } });
    if (task && linked.taskId) {
      const taskMeta = await firestore.getDocMeta(`tasks/${linked.taskId}`);
      if (taskMeta) additionalWrites.push({
        path: `tasks/${linked.taskId}`,
        data: { completions: Number(task.completions || 0) + 1, updatedAt: now },
        updateMask: ["completions", "updatedAt"],
        condition: taskMeta.updateTime ? { updateTime: taskMeta.updateTime } : undefined,
      });
    }
    const result = await creditReward(firestore, {
      userId,
      amountRupees,
      type: "task",
      source: providerName,
      provider: providerName,
      providerTransactionId,
      transactionKey: eventKey,
      description: `${providerName} — ${providerTransactionId}`,
      additionalWrites,
    });
    return json({ handled: true, alreadyProcessed: !!result.alreadyProcessed, transactionId: result.transactionId });
  }

  const result = await creditReward(firestore, {
    userId, amountRupees, type: mapProviderToType(providerName), source: providerName,
    provider: providerName, providerTransactionId, description: `${providerName} — ${providerTransactionId}`,
  });
  return json({ handled: true, alreadyProcessed: !!result.alreadyProcessed, transactionId: result.transactionId });
}

export const handleProviderGenericPostback = (request, env, firestore) => handleProviderPostback(request, env, firestore, { providerName: "provider" });
export const handleAdsgramPostback = (request, env, firestore) => handleProviderPostback(request, env, firestore, { providerName: "adsgram", secretEnvVar: "ADSGRAM_SECRET" });
export const handleSurveyPostback = (request, env, firestore) => handleProviderPostback(request, env, firestore, { providerName: "survey", secretEnvVar: "SURVEY_SECRET" });
export const handleOfferPostback = (request, env, firestore) => handleProviderPostback(request, env, firestore, { providerName: "offer", secretEnvVar: "OFFER_SECRET" });
