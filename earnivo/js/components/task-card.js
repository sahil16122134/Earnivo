/** Ledger Light design: task cards behave like offset ledger slips, making conditions easy to scan. */
import { currency, escapeHtml } from "../utils.js";

export function taskCard(task) {
  return `<article class="task-slip" data-task-id="${escapeHtml(task.id)}"><div class="task-slip__top"><span class="task-icon" aria-hidden="true">${escapeHtml(task.icon || "✦")}</span><span class="provider-chip">${escapeHtml(task.provider || "Earnivo")}</span></div><div><p class="task-category">${escapeHtml(task.category || "Task")}</p><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.description || "Review the task terms to see if you are eligible.")}</p></div><div class="task-slip__bottom"><strong>${currency(task.reward)}</strong><button class="text-action" type="button" data-open-task="${escapeHtml(task.id)}">View task <span aria-hidden="true">→</span></button></div></article>`;
}

