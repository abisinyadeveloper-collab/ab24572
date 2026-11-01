/** Browser-safe rules for Ghost email notifications. */

export const WELCOME_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const PASSWORD_NOTICE_COOLDOWN_MS = 60 * 1000;

/** Welcome goes once, only to confirmed accounts created in the last 3 days. */
export function shouldSendWelcome(opts: { confirmed: boolean; createdAt: string; alreadySent: boolean; now?: number }) {
  if (!opts.confirmed || opts.alreadySent) return false;
  return (opts.now ?? Date.now()) - new Date(opts.createdAt).getTime() <= WELCOME_WINDOW_MS;
}

/** Alert only for an unseen device on an account that already had at least one known device. */
export function shouldAlertSignIn(opts: { deviceKnown: boolean; knownDevices: number; enabled: boolean }) {
  return opts.enabled && !opts.deviceKnown && opts.knownDevices > 0;
}

export function deviceLabel(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "unknown system";
  return `${browser} on ${os}`;
}

export function emailTime(date = new Date()): string {
  return date.toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " (Addis Ababa)";
}
