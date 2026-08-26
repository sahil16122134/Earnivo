/** Ledger Light design: a compact, low-emphasis footer can be mounted on selected member pages without changing page structure. */
export function mountFooter(target) {
  if (!target) return;
  target.innerHTML = `<footer class="earnivo-footer" aria-label="Earnivo information"><span>Earnivo</span><nav><a href="/#about">About</a><a href="/#how-it-works">How it works</a><a href="/pages/improve.html?topic=terms">Terms</a><a href="/pages/improve.html?topic=privacy">Privacy policy</a><a href="/pages/improve.html">Contact / support</a></nav></footer>`;
}
