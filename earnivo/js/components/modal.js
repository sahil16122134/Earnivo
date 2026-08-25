/** Ledger Light design: dialogs re-state the key condition before a user commits an action. */
import { shouldCloseModal } from "../testing/behavior-contracts.js";
export function openModal({ title, content, actions = [] }) {
  const dialog = document.createElement("dialog");
  dialog.className = "ledger-modal";
  dialog.innerHTML = `<form method="dialog" class="modal-shell"><div class="modal-heading"><div><p class="eyebrow">Earnivo</p><h2>${title}</h2></div><button class="icon-button" value="cancel" aria-label="Close">×</button></div><div class="modal-content">${content}</div><div class="modal-actions"></div></form>`;
  const actionsHost = dialog.querySelector(".modal-actions");
  actions.forEach(({ label, className = "button button--primary", onClick, value = "" }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.value = value;
    button.addEventListener("click", async () => {
      const shouldClose = await onClick?.(dialog, button);
      if (shouldCloseModal(shouldClose)) dialog.close();
    });
    actionsHost.append(button);
  });
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return dialog;
}
