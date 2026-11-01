import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import emblem from "@/assets/ghost-emblem.jpg";

type Mode = "login" | "signup" | "reset";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-[18px]">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GhostAuth({ open, onOpenChange, next }: { open: boolean; onOpenChange: (v: boolean) => void; next?: string }) {
  const returnUrl = () => (next ? new URL(next, window.location.origin).href : window.location.origin);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const switchMode = (m: Mode) => { setMode(m); setNotice(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setNotice(null);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setNotice({ tone: "ok", text: "Check your inbox for a reset link." });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } });
        if (error) throw error;
        setNotice({ tone: "ok", text: "Almost there — confirm your email, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
      }
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Unable to sign in." });
    } finally {
      setBusy("");
    }
  }

  async function google() {
    setBusy("google");
    setNotice(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl() });
    if (result.error) { setNotice({ tone: "error", text: result.error.message }); setBusy(""); }
    else if (!result.redirected) { setBusy(""); onOpenChange(false); }
  }

  const title = mode === "signup" ? "Create your Ghost account" : mode === "reset" ? "Reset your password" : "Welcome back";
  const subtitle = mode === "reset" ? "We'll email you a secure link." : "Private conversations. A workspace of your own.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-panel auth-panel max-w-[400px]">
        <div className="auth-glow" aria-hidden="true" />
        <DialogHeader className="items-center text-center">
          <img src={emblem} alt="" className="auth-emblem" />
          <DialogTitle className="text-2xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {mode !== "reset" && (
          <>
            <div className="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Create account</button>
            </div>
            <Button type="button" variant="outline" className="auth-google h-12 rounded-full" onClick={google} disabled={!!busy}>
              {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
              Continue with Google
            </Button>
            <div className="auth-divider">or with email</div>
          </>
        )}

        <form onSubmit={submit} className="grid gap-3">
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
                placeholder={mode === "signup" ? "Create a password (8+ characters)" : "Password"}
                minLength={8}
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
          {mode === "login" && (
            <button type="button" className="auth-link justify-self-end" onClick={() => switchMode("reset")}>Forgot password?</button>
          )}
          <Button className="auth-submit h-12 rounded-full" disabled={!!busy}>
            {busy === "email" && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
          </Button>
        </form>

        {notice && <p role="status" className={`auth-notice ${notice.tone}`}>{notice.text}</p>}
        {mode === "reset" && <button type="button" className="auth-link mx-auto" onClick={() => switchMode("login")}>Back to sign in</button>}
        <p className="auth-fine">By continuing you agree to use Ghost responsibly. ABISINYA</p>
      </DialogContent>
    </Dialog>
  );
}
