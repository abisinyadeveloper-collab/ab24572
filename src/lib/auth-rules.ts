export const MIN_PASSWORD = 8;

/** Returns a human message when the new password is not acceptable, otherwise null. */
export function passwordIssue(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Mix letters and at least one number.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/** 0–4 strength score for the meter under the password field. */
export function passwordStrength(password: string): number {
  let s = 0;
  if (password.length >= MIN_PASSWORD) s++;
  if (password.length >= 12) s++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
  return s;
}

/** Reads Ghost auth link results from the URL hash or query (confirmation, recovery, expired links). */
export function readAuthLink(hash: string, search: string) {
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const q = new URLSearchParams(search.replace(/^\?/, ""));
  const pick = (k: string) => h.get(k) ?? q.get(k);
  const code = pick("error_code");
  const description = pick("error_description");
  const error = code || description
    ? code === "otp_expired" || /expired|invalid/i.test(description ?? "")
      ? "This link has expired or was already used. Request a new one."
      : (description ?? "This link could not be used.").replace(/\+/g, " ")
    : null;
  return { type: pick("type"), error, hasToken: Boolean(h.get("access_token") || q.get("code") || q.get("token_hash")) };
}

/** Turns raw sign-in errors into short, friendly Ghost messages. */
export function friendlyAuthError(message: string): { text: string; unconfirmed?: boolean } {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) return { text: "Please confirm your email first. We can send the link again.", unconfirmed: true };
  if (m.includes("invalid login credentials")) return { text: "That email or password isn't right." };
  if (m.includes("already registered") || m.includes("already been registered")) return { text: "An account with this email already exists. Sign in instead." };
  if (m.includes("rate limit") || m.includes("security purposes")) return { text: "Too many attempts. Wait a minute and try again." };
  if (m.includes("pwned") || m.includes("weak") || m.includes("known to be")) return { text: "This password has appeared in a data leak. Choose a different one." };
  if (m.includes("same") && m.includes("password")) return { text: "Choose a password different from your old one." };
  return { text: message };
}
