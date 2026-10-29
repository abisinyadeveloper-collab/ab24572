// The only place the offline worker registers; refuses in dev, iframes and Lovable previews.
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const LOVABLE_HOSTS = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

function refused() {
  const host = window.location.hostname.toLowerCase();
  const label = host.split(".")[0];
  let framed = true;
  try { framed = window.self !== window.top; } catch { /* cross-origin frame */ }
  return (
    !import.meta.env.PROD ||
    framed ||
    new URLSearchParams(window.location.search).get("sw") === "off" ||
    (LOVABLE_HOSTS.some((d) => host.endsWith(d)) && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) ||
    ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some((d) => host === d || host.endsWith(`.${d}`))
  );
}

export async function registerGhostWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}
