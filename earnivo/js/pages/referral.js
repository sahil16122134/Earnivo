/** Ledger Light design: referrals display pending and verified outcomes separately, with rewards shown only after a verified qualifying action. */
import { requireUser } from "../auth.js";
import { api } from "../api.js";
import { $, currency, escapeHtml } from "../utils.js";
import { mountNavbar } from "../components/navbar.js";
import { toast } from "../components/toast.js";

const root = $("#referral-root");
async function init() { try { const user = await requireUser(); if (!user) return; await mountNavbar("referral"); const data = await api.get("/v1/referrals"); root.className = ""; root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">Refer & earn</p><h1>Share a clear invitation.</h1><p>Referral rewards are credited only after the configured qualifying action is approved.</p></div></section><section class="profile-layout"><article><div class="balance-card"><p class="eyebrow">Your referral code</p><div class="balance-amount" style="font-size:3rem">${escapeHtml(data.code)}</div><p>${escapeHtml(data.qualifyingRule || "Qualifying rules are set by Earnivo administration.")}</p><button class="button" type="button" data-copy-code>Copy invitation link</button></div><section class="section-heading"><div><p class="eyebrow">Referral record</p><h2>${escapeHtml(String(data.verifiedReferrals || 0))} verified · ${escapeHtml(String(data.pendingReferrals || 0))} pending</h2><p>${currency(data.referralRewards || 0)} credited from verified referrals.</p></div></section></article><aside class="profile-note"><h2>Be direct about the terms.</h2><p>Send the invitation only to people who want to join. A relationship remains pending until the invited member’s configured qualifying task is approved.</p></aside></section>`; $("[data-copy-code]", root).addEventListener("click", async () => { try { await navigator.clipboard.writeText(data.inviteUrl); toast("Invitation link copied.", "success"); } catch { toast("Copy this link: " + data.inviteUrl, "info"); } }); } catch (error) { root.className = "empty-state"; root.innerHTML = `<h2>Your referral record could not be opened.</h2><p>${escapeHtml(error.message)}</p>`; } }
init();

