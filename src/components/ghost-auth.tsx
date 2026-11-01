import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppleMark, GoogleMark, MicrosoftMark } from "@/components/auth-marks";
import { friendlyAuthError, passwordIssue, passwordStrength, MIN_PASSWORD } from "@/lib/auth-rules";
import emblem from "@/assets/ghost-emblem.jpg";

type Mode = "login" | "signup" | "reset" | "sent";
type Provider = "google" | "apple" | "microsoft";
type Sent = { kind: "signup" | "reset"; email: string };

const PROVIDERS: { id: Provider; label: string; Mark: () => React.JSX.Element }[] = [
  { id: "google", label: "Google", Mark: GoogleMark },
  { id: "apple", label: "Apple", Mark: AppleMark },
  { id: "microsoft", label: "Microsoft", Mark: MicrosoftMark },
];
const STRENGTH = ["Too short", "Weak", "Okay", "Strong", "Very strong"];

export function GhostAuth({ open, onOpenChange, next }: { open: boolean; onOpenChange: (v: boolean) => void; next?: string }) {
  const nextPath = next && next.startsWith("/") ? next : "/";
  const confirmUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"" | "email" | "resend" | Provider>("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; unconfirmed?: boolean } | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const switchMode = (m: Mode) => { setMode(m); setNotice(null); setConfirm(""); };
  const fail = (err: unknown) => {
    const f = friendlyAuthError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    setNotice({ tone: "error", ...f });
  };

  async function sendLink(kind: Sent["kind"], to: string) {
    if (kind === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(to, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.resend({ type: "signup", email: to, options: { emailRedirectTo: confirmUrl() } });
      if (error) throw error;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const addr = email.trim().toLowerCase();
    if (mode === "signup") {
      const issue = passwordIssue(password, confirm);
      if (issue) return setNotice({ tone: "error", text: issue });
    }
    setBusy("email");
    try {
      if (mode === "reset") {
        await sendLink("reset", addr);
        setSent({ kind: "reset", email: addr }); setCooldown(60); setMode("sent");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: addr, password, options: { emailRedirectTo: confirmUrl() } });
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) {
          setNotice({ tone: "error", text: "An account with this email already exists. Sign in instead." });
        } else if (data.session) {
          onOpenChange(false);
        } else {
          setSent({ kind: "signup", email: addr }); setCooldown(60); setMode("sent"); setPassword(""); setConfirm("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
        onOpenChange(false);
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy("");
    }
  }

  async function resend(kind: Sent["kind"], to: string) {
    if (!to || cooldown > 0) return;
    setBusy("resend");
    try {
      await sendLink(kind, to);
      setCooldown(60);
      setNotice({ tone: "ok", text: "A new link is on its way." });
    } catch (err) { fail(err); } finally { setBusy(""); }
  }

  async function social(provider: Provider) {
    setBusy(provider);
    setNotice(null);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: new URL(nextPath, window.location.origin).href });
    if (result.error) { fail(result.error); setBusy(""); }
    else if (!result.redirected) { setBusy(""); onOpenChange(false); }
  }

  const title = mode === "sent" ? "Check your inbox"
    : mode === "signup" ? "Create your Ghost account"
    : mode === "reset" ? "Forgot your password?" : "Welcome back";
  const subtitle = mode === "sent" ? ""
    : mode === "reset" ? "Enter your email and we'll send you a secure reset link."
    : "Private conversations. A workspace of your own.";
  const strength = passwordStrength(password);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-panel auth-panel max-w-[420px]">
        <div className="auth-glow" aria-hidden="true" />
        <DialogHeader className="items-center text-center">
          {mode === "sent"
            ? <span className="auth-badge"><MailCheck className="size-6" /></span>
            : <img src={emblem} alt="Ghost" className="auth-emblem" />}
          <DialogTitle className="text-2xl font-semibold tracking-tight">{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        {mode === "sent" && sent && (
          <div className="grid gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {sent.kind === "signup" ? "We sent a confirmation link to" : "We sent a password reset link to"}
              <br /><strong className="text-foreground">{sent.email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              {sent.kind === "signup" ? "Open it to activate your account." : "Open it to choose a new password."} Can't find it? Check spam or promotions.
            </p>
            <Button variant="outline" className="h-11 rounded-full" disabled={cooldown > 0 || busy === "resend"} onClick={() => resend(sent.kind, sent.email)}>
              {busy === "resend" && <Loader2 className="size-4 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
            </Button>
            <button type="button" className="auth-link mx-auto" onClick={() => switchMode("login")}>Back to sign in</button>
          </div>
        )}

        {(mode === "login" || mode === "signup") && (
          <>
            <div className="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Create account</button>
            </div>
            <div className="auth-socials">
              {PROVIDERS.map(({ id, label, Mark }) => (
                <Button key={id} type="button" variant="outline" className="auth-social" onClick={() => social(id)} disabled={!!busy} aria-label={`Continue with ${label}`}>
                  {busy === id ? <Loader2 className="size-4 animate-spin" /> : <Mark />}
                  <span>{label}</span>
                </Button>
              ))}
            </div>
            <div className="auth-divider">or with email</div>
          </>
        )}

        {mode !== "sent" && (
          <form onSubmit={submit} className="grid gap-3" noValidate={false}>
            <label className="auth-input">
              <Mail className="size-4" aria-hidden="true" />
              <span className="sr-only">Email</span>
              <input type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {mode !== "reset" && (
              <label className="auth-input">
                <Lock className="size-4" aria-hidden="true" />
                <span className="sr-only">Password</span>
                <input
                  type={show ? "text" : "password"}
                  placeholder={mode === "signup" ? `Create a password (${MIN_PASSWORD}+ characters)` : "Password"}
                  minLength={mode === "signup" ? MIN_PASSWORD : undefined}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </label>
            )}
            {mode === "signup" && (
              <>
                {password && (
                  <div className="auth-strength" data-score={strength} aria-live="polite">
                    <div className="auth-strength-bar"><span style={{ width: `${(strength / 4) * 100}%` }} /></div>
                    <span>{STRENGTH[strength]}</span>
                  </div>
                )}
                <label className="auth-input">
                  <Lock className="size-4" aria-hidden="true" />
                  <span className="sr-only">Confirm password</span>
                  <input type={show ? "text" : "password"} placeholder="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </label>
              </>
            )}
            {mode === "login" && (
              <button type="button" className="auth-link justify-self-end" onClick={() => switchMode("reset")}>Forgot password?</button>
            )}
            <Button className="auth-submit h-12 rounded-full" disabled={!!busy}>
              {busy === "email" && <Loader2 className="size-4 animate-spin" />}
              {mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
            </Button>
          </form>
        )}

        {notice && (
          <div role="status" className={`auth-notice ${notice.tone}`}>
            {notice.text}
            {notice.unconfirmed && (
              <button type="button" className="auth-link block mx-auto mt-1" disabled={cooldown > 0} onClick={() => resend("signup", email.trim().toLowerCase())}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}
        {mode === "reset" && (
          <button type="button" className="auth-link mx-auto inline-flex items-center gap-1" onClick={() => switchMode("login")}>
            <ArrowLeft className="size-3" /> Back to sign in
          </button>
        )}
        <p className="auth-fine">By continuing you agree to use Ghost responsibly · ABISINYA</p>
      </DialogContent>
    </Dialog>
  );
}
