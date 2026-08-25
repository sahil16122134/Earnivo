// Reusable modal/dialog system for Earnivo.
// Import { Modal } and call Modal.confirm(...) / Modal.alert(...) / Modal.custom(...)
// from any page — no per-page modal markup needed.
//
// Design rules encoded here (see UI audit):
//  - Non-critical modals close on ESC / backdrop click.
//  - Destructive / financial confirms require an explicit button press.
//  - Focus is trapped and returned to the trigger element on close.

const ICONS = {
  success: "\u2713",
  warning: "\u26A0",
  error: "!",
  neutral: "\u2139",
};

let lastFocused = null;

function buildCard({ tone = "neutral", title, message, detailsHtml = "", fieldsHtml = "", closable = true }) {
  const card = document.createElement("div");
  card.className = "modal-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  if (title) card.setAttribute("aria-label", title);

  card.innerHTML = `
    <div class="modal-grabber" aria-hidden="true"></div>
    ${closable ? `<button type="button" class="modal-close-x" aria-label="Close">✕</button>` : ""}
    <div class="modal-icon tone-${tone}" aria-hidden="true">${ICONS[tone] || ICONS.neutral}</div>
    ${title ? `<div class="modal-title">${escapeHtml(title)}</div>` : ""}
    ${message ? `<div class="modal-message">${escapeHtml(message)}</div>` : ""}
    ${detailsHtml}
    ${fieldsHtml}
    <div class="modal-actions-slot"></div>
  `;
  return card;
}

function detailsRows(rows = []) {
  if (!rows.length) return "";
  return `<div class="modal-details">${rows
    .map(
      (r) =>
        `<div class="modal-detail-row${r.total ? " total" : ""}"><span class="l">${escapeHtml(
          r.label
        )}</span><span class="v">${escapeHtml(String(r.value))}</span></div>`
    )
    .join("")}</div>`;
}

function fieldsMarkup(fields = []) {
  if (!fields.length) return "";
  return `<div class="modal-fields">${fields
    .map((f) => {
      const tag = f.type === "select" ? "select" : f.type === "textarea" ? "textarea" : "input";
      const attrs = tag === "input" ? `type="${f.inputType || "text"}"` : "";
      const inner =
        tag === "select"
          ? (f.options || []).map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")
          : "";
      const placeholder = f.placeholder ? `placeholder="${escapeHtml(f.placeholder)}"` : "";
      return `<label class="modal-field">
        <span class="modal-field-label">${escapeHtml(f.label)}</span>
        <${tag} id="modal-field-${f.id}" ${attrs} ${placeholder}>${inner}</${tag}>
      </label>`;
    })
    .join("")}</div>`;
}

function readFieldValues(card, fields = []) {
  const out = {};
  fields.forEach((f) => {
    const el = card.querySelector(`#modal-field-${f.id}`);
    out[f.id] = el ? el.value.trim() : "";
  });
  return out;
}

function open({ tone, title, message, rows, fields, closable = true, buttons }) {
  return new Promise((resolve) => {
    lastFocused = document.activeElement;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const card = buildCard({ tone, title, message, detailsHtml: detailsRows(rows), fieldsHtml: fieldsMarkup(fields), closable });
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    const actionsSlot = card.querySelector(".modal-actions-slot");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "modal-actions row";

    const cleanup = (value) => {
      backdrop.classList.remove("open");
      document.removeEventListener("keydown", onKeydown);
      setTimeout(() => {
        backdrop.remove();
        document.body.style.overflow = "";
        if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
      }, 180);
      resolve(value);
    };

    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn ${b.className || "btn-ghost"}`;
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        if (b.value === true && fields && fields.length) {
          const values = readFieldValues(card, fields);
          const required = fields.find((f) => f.required && !values[f.id]);
          if (required) {
            const el = card.querySelector(`#modal-field-${required.id}`);
            el?.classList.add("modal-field-error");
            el?.focus();
            return;
          }
          cleanup(values);
          return;
        }
        cleanup(b.value);
      });
      actionsWrap.appendChild(btn);
    });
    actionsSlot.replaceWith(actionsWrap);

    const closeXBtn = card.querySelector(".modal-close-x");
    if (closeXBtn) closeXBtn.addEventListener("click", () => cleanup(fields && fields.length ? null : false));

    if (closable) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(fields && fields.length ? null : false);
      });
    }

    function onKeydown(e) {
      if (e.key === "Escape" && closable) {
        cleanup(fields && fields.length ? null : false);
        return;
      }
      if (e.key === "Tab") trapFocus(e, card);
    }
    document.addEventListener("keydown", onKeydown);

    requestAnimationFrame(() => {
      backdrop.classList.add("open");
      const firstField = card.querySelector("input, select, textarea");
      const firstBtn = actionsWrap.querySelector("button");
      (firstField || firstBtn || card).focus?.();
    });
  });
}

function trapFocus(e, container) {
  const focusables = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const Modal = {
  /**
   * Confirmation dialog. Resolves true if confirmed, false otherwise.
   * Use `destructive: true` for irreversible/financial actions — this
   * removes backdrop/ESC dismissal so the user must press a button.
   */
  confirm({ title, message, rows, confirmText = "Confirm", cancelText = "Cancel", destructive = false, tone = "neutral" }) {
    return open({
      tone,
      title,
      message,
      rows,
      closable: !destructive,
      buttons: [
        { label: cancelText, value: false, className: "btn-ghost" },
        { label: confirmText, value: true, className: destructive ? "btn-danger" : "btn-primary" },
      ],
    });
  },

  /**
   * Replaces window.prompt()/a chain of prompts with a single accessible
   * form modal. `fields` are rendered in order; resolves an object keyed
   * by field id, or null if cancelled/closed.
   */
  form({ title, message, fields, confirmText = "Continue", cancelText = "Cancel", destructive = false, tone = "neutral" }) {
    return open({
      tone,
      title,
      message,
      fields,
      closable: !destructive,
      buttons: [
        { label: cancelText, value: null, className: "btn-ghost" },
        { label: confirmText, value: true, className: destructive ? "btn-danger" : "btn-primary" },
      ],
    });
  },

  /** Single-button informational/success/error/warning popup. */
  alert({ title, message, rows, tone = "neutral", buttonText = "OK" }) {
    return open({
      tone,
      title,
      message,
      rows,
      closable: true,
      buttons: [{ label: buttonText, value: true, className: "btn-primary" }],
    });
  },

  success({ title = "Success", message, rows, buttonText, onAction, actionText }) {
    if (actionText && onAction) {
      return open({
        tone: "success",
        title,
        message,
        rows,
        closable: true,
        buttons: [
          { label: buttonText || "Close", value: false, className: "btn-ghost" },
          { label: actionText, value: "action", className: "btn-primary" },
        ],
      }).then((v) => {
        if (v === "action") onAction();
        return v;
      });
    }
    return this.alert({ title, message, rows, tone: "success", buttonText: buttonText || "Done" });
  },

  error({ title = "Something went wrong", message, buttonText = "OK" }) {
    return this.alert({ title, message, tone: "error", buttonText });
  },

  info({ title, message, rows, buttonText = "Got it" }) {
    return this.alert({ title, message, rows, tone: "neutral", buttonText });
  },
};

/** Turns raw/technical errors into a user-safe message. Never surfaces
 * stack traces, HTTP codes, or backend/library error strings. */
export function friendlyMessage(err) {
  const raw = (err && err.message) || "";
  // ApiError instances already carry a server-authored, user-safe message
  // (see js/services/api.js) — but guard against it accidentally containing
  // technical-looking text too.
  const looksTechnical = /fetch|network|undefined|null|Firebase|HTTP \d|AppError|TypeError|SyntaxError|\[object/i.test(raw);
  if (err && err.code && raw && !looksTechnical) return raw;
  return "Something went wrong. Please try again.";
}
