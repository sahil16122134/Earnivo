import { renderAdminNav } from "./admin-nav.js";
import { auth } from "../../js/services/firebase.js";
import { WORKER_BASE_URL } from "../../js/config.js";
import { Modal } from "../../js/components/modal.js";
import { Toast } from "../../js/components/toast.js";

renderAdminNav("settings.html");

const fields = {
  minWithdraw: document.getElementById("set-min-withdraw"),
  dailyLimit: document.getElementById("set-daily-limit"),
  referral: document.getElementById("set-referral"),
  bonus: document.getElementById("set-bonus"),
  supportEmail: document.getElementById("set-support-email"),
  maintenance: document.getElementById("set-maintenance"),
};
const methods = { upi: document.getElementById("m-upi"), amazon: document.getElementById("m-amazon"), flipkart: document.getElementById("m-flipkart"), myntra: document.getElementById("m-myntra") };

load();

async function load() {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const res = await fetch(`${WORKER_BASE_URL}/admin/settings`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const json = await res.json();
    const s = json.data || {};
    fields.minWithdraw.value = s.minWithdrawRupees ?? 50;
    fields.dailyLimit.value = s.dailyWithdrawLimitRupees ?? "";
    fields.referral.value = s.referralRewardRupees ?? 20;
    fields.bonus.value = s.dailyBonusBaseRupees ?? 5;
    fields.supportEmail.value = s.supportEmail ?? "";
    fields.maintenance.checked = !!s.maintenanceMode;
    maintenanceWasOn = !!s.maintenanceMode;
    (s.enabledMethods || ["upi"]).forEach((m) => { if (methods[m]) methods[m].checked = true; });
  } catch (e) {
    document.getElementById("save-status").textContent = "Couldn't load current settings — showing defaults.";
  }
}

let maintenanceWasOn = false;

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  const statusEl = document.getElementById("save-status");

  const turningMaintenanceOn = fields.maintenance.checked && !maintenanceWasOn;
  if (turningMaintenanceOn) {
    const ok = await Modal.confirm({
      title: "Enable maintenance mode?",
      message: "Users won't be able to submit withdrawals while this is on.",
      confirmText: "Enable",
      destructive: true,
      tone: "warning",
    });
    if (!ok) return;
  }

  statusEl.textContent = "Saving…";
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const payload = {
      minWithdrawRupees: Number(fields.minWithdraw.value),
      dailyWithdrawLimitRupees: Number(fields.dailyLimit.value),
      referralRewardRupees: Number(fields.referral.value),
      dailyBonusBaseRupees: Number(fields.bonus.value),
      supportEmail: fields.supportEmail.value,
      maintenanceMode: fields.maintenance.checked,
      enabledMethods: Object.entries(methods).filter(([, el]) => el.checked).map(([k]) => k),
    };
    const res = await fetch(`${WORKER_BASE_URL}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error();
    maintenanceWasOn = fields.maintenance.checked;
    statusEl.textContent = "Settings saved.";
    Toast.success("Settings saved.");
  } catch (e) {
    statusEl.textContent = "Couldn't save settings. Confirm the Worker's /admin/settings endpoint is deployed.";
    Modal.error({ title: "Couldn't save settings", message: "Confirm the Worker's /admin/settings endpoint is deployed and try again." });
  }
});
