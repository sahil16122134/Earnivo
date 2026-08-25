/** Daily caps track approved campaign completions in UTC, so a new day begins consistently for every member. */
export function dailyCompletionLimit(task = {}) {
  const limit = Number(task.dailyLimit || 0);
  return Number.isInteger(limit) && limit > 0 ? limit : 0;
}

export function utcDay(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function dailyCounterId(taskId, day) {
  return `${taskId}_${day}`;
}

export function canRecordDailyCompletion(task, record) {
  const limit = dailyCompletionLimit(task);
  const completed = Number(record?.completedCount || 0);
  return !limit || completed < limit;
}

