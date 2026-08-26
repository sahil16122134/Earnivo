/** Member navigation preserves loaded modules, Firebase state, and the current view until the next page shell is ready. */
const memberPage = (url) => url.origin === location.origin && /^\/pages\/(home|tasks|wallet|referral|profile)\.html$/.test(url.pathname);
let controller = null;

async function loadMemberPage(url, { push = true } = {}) {
  if (!memberPage(url) || (push && `${url.pathname}${url.search}` === `${location.pathname}${location.search}`)) return;
  controller?.abort(); controller = new AbortController();
  try {
    const response = await fetch(`${url.pathname}${url.search}`, { signal: controller.signal, headers: { "X-Requested-With": "EarnivoNavigation" } });
    if (!response.ok) throw new Error("Navigation request failed.");
    const nextDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const nextShell = nextDocument.querySelector(".app-shell"); const nextScript = nextDocument.querySelector('script[type="module"][src]'); const currentShell = document.querySelector(".app-shell");
    if (!nextShell || !nextScript || !currentShell) throw new Error("Navigation shell is unavailable.");
    nextDocument.querySelectorAll('link[rel="stylesheet"]').forEach((link) => { if (![...document.head.querySelectorAll('link[rel="stylesheet"]')].some((current) => current.href === link.href)) document.head.append(link.cloneNode(true)); });
    document.title = nextDocument.title || document.title; currentShell.replaceWith(nextShell); if (push) history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    await import(`${new URL(nextScript.getAttribute("src"), location.origin).href}#view-${Date.now()}`);
    window.scrollTo(0, 0);
  } catch (error) { if (error.name !== "AbortError") window.location.assign(`${url.pathname}${url.search}${url.hash}`); }
}

export function enableMemberNavigation() {
  if (window.__earnivoMemberNavigationEnabled) return;
  window.__earnivoMemberNavigationEnabled = true;
  document.addEventListener("click", (event) => { const anchor = event.target.closest("a[href]"); if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || anchor.target || anchor.hasAttribute("download")) return; const url = new URL(anchor.href, location.origin); if (!memberPage(url)) return; event.preventDefault(); loadMemberPage(url); });
  window.addEventListener("popstate", () => loadMemberPage(new URL(location.href), { push: false }));
}
