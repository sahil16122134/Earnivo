// Reusable toast system for small, non-critical feedback (copied to
// clipboard, minor confirmations). Use Modal for anything financial,
// destructive, or otherwise important — toasts are easy to miss.

const ICONS = { success: "\u2713", error: "!", info: "\u2139", warning: "\u26A0" };

function getRegion() {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }
  return region;
}

export const Toast = {
  show(message, { type = "info", duration = 3200 } = {}) {
    const region = getRegion();
    const el = document.createElement("div");
    el.className = `toast tone-${type}`;
    el.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${ICONS[type] || ICONS.info}</span>
      <span class="toast-msg">${String(message)}</span>
      <button type="button" class="toast-close" aria-label="Dismiss">✕</button>
    `;
    region.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      el.classList.remove("show");
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
    return dismiss;
  },
  success(message, opts = {}) {
    return this.show(message, { ...opts, type: "success" });
  },
  error(message, opts = {}) {
    return this.show(message, { ...opts, type: "error" });
  },
  info(message, opts = {}) {
    return this.show(message, { ...opts, type: "info" });
  },
  warning(message, opts = {}) {
    return this.show(message, { ...opts, type: "warning" });
  },
};
